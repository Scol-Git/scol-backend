import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import type { IRateLimitingStorage } from '@shared/interfaces/infrastructure/IRateLimitingStorage.interface';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import { RedisConnectionService } from '../../cache/RedisConnectionService.service';

/**
 * Lua script for atomic sliding window rate limiting using Redis Sorted Set.
 *
 * **Algorithm:**
 * 1. Get current timestamp
 * 2. Remove timestamps older than window (ZREMRANGEBYSCORE)
 * 3. Count remaining timestamps (ZCARD)
 * 4. If under limit, add current timestamp (ZADD)
 * 5. Set expiration (EXPIRE)
 * 6. Return count
 *
 * **Benefits:**
 * - Atomic operation (no race conditions)
 * - Single round trip to Redis
 * - Efficient for distributed systems
 *
 * **Parameters:**
 * - KEYS[1]: Rate limit key
 * - ARGV[1]: Current timestamp (seconds)
 * - ARGV[2]: Window start timestamp (current - windowSeconds)
 * - ARGV[3]: Limit
 * - ARGV[4]: Window TTL (windowSeconds + 1 for buffer)
 *
 * **Returns:**
 * - Current count in window
 */
const RATE_LIMIT_LUA_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window_start = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local window_ttl = tonumber(ARGV[4])

-- Remove timestamps outside the window
redis.call('ZREMRANGEBYSCORE', key, '-inf', window_start)

-- Get current count
local count = redis.call('ZCARD', key)

-- Add current timestamp if under limit
-- Note: We always add to track the request, even if over limit
-- The consumer decides whether to reject based on count
redis.call('ZADD', key, now, now)

-- Update count after adding
count = count + 1

-- Set expiration
redis.call('EXPIRE', key, window_ttl)

-- Return current count
return count
`;

/**
 * Rate Limiting Storage Implementation (Redis)
 *
 * **Features:**
 * - Atomic sliding window using Lua script
 * - Distributed rate limiting (works across multiple instances)
 * - Sorted set-based implementation (efficient)
 * - Fail-open behavior (never blocks on errors)
 * - Automatic key expiration
 *
 * **Algorithm:**
 * - Uses Redis Sorted Set (ZSET)
 * - Score = timestamp (Unix seconds)
 * - Member = timestamp (ensures uniqueness with millisecond precision)
 * - Lua script ensures atomicity
 *
 * **Key Features:**
 * - Single round trip to Redis (Lua script)
 * - No race conditions (atomic operations)
 * - Automatic cleanup (ZREMRANGEBYSCORE in script)
 * - Efficient for high-throughput scenarios
 *
 * **Behavior:**
 * - On Redis error: fails open (returns { count: 0, remaining: limit })
 * - Never throws exceptions
 * - Logs errors for monitoring
 *
 * @class RateLimitingStorage
 * @implements {IRateLimitingStorage}
 */
@Injectable()
export class RateLimitingStorage implements IRateLimitingStorage, OnModuleInit {
  private _client: Redis | null = null;
  private _luaScriptSha: string | null = null;

  constructor(
    private readonly _redisConnection: RedisConnectionService,
    @Inject(ILogger) private readonly _logger: ILoggerInterface,
  ) {}

  async onModuleInit(): Promise<void> {
    this._client = this._redisConnection.getClient();

    if (this._client && this._redisConnection.isAvailable) {
      try {
        // Load Lua script into Redis (stored as SHA for efficiency)
        const scriptSha = await this._client.script(
          'LOAD',
          RATE_LIMIT_LUA_SCRIPT,
        );
        this._luaScriptSha = String(scriptSha);

        this._logger.LogInfo(
          `Rate limiting storage (Redis) initialized with Lua script (SHA: ${this._luaScriptSha.substring(0, 8)}...)`,
        );
      } catch (error) {
        this._logger.LogWarning(
          'Failed to load Lua script for rate limiting, will use inline script',
          { error },
        );
        // Don't fail initialization, we'll use inline script as fallback
      }
    } else {
      this._logger.LogWarning(
        'Redis connection not available, rate limiting will fail-open',
      );
    }
  }

  private _ensureConnected(): void {
    if (!this._client || !this._redisConnection.isAvailable) {
      throw new Error('Redis rate limiting storage is not available');
    }
  }

  /**
   * Increment request count using Lua script for atomic sliding window.
   *
   * **Algorithm:**
   * 1. Execute Lua script with current timestamp and window parameters
   * 2. Script atomically:
   *    - Removes expired timestamps
   *    - Adds current timestamp
   *    - Returns count
   * 3. Calculate remaining and reset time
   *
   * **Thread Safety:**
   * - Atomic via Lua script execution
   * - No race conditions across distributed instances
   *
   * **Behavior:**
   * - On Redis error: fails open (allows request)
   * - Never throws exceptions
   * - Logs errors for monitoring
   */
  async increment(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<{
    count: number;
    limit: number;
    reset: number;
    remaining: number;
  }> {
    try {
      this._ensureConnected();

      const now = Date.now() / 1000; // Unix timestamp in seconds with decimals
      const windowStart = now - windowSeconds;
      const windowTtl = windowSeconds + 1; // Add 1 second buffer
      const resetTime = Math.ceil(now) + windowSeconds;

      let count: number;

      try {
        // Try to use pre-loaded script (faster)
        if (this._luaScriptSha) {
          const result = await this._client!.evalsha(
            this._luaScriptSha,
            1,
            key,
            now.toString(),
            windowStart.toString(),
            limit.toString(),
            windowTtl.toString(),
          );
          count = Number(result);
        } else {
          // Fallback to inline script
          const result = await this._client!.eval(
            RATE_LIMIT_LUA_SCRIPT,
            1,
            key,
            now.toString(),
            windowStart.toString(),
            limit.toString(),
            windowTtl.toString(),
          );
          count = Number(result);
        }
      } catch (scriptError: unknown) {
        // If script not found (e.g., Redis restarted), reload it
        const errorMessage =
          scriptError instanceof Error
            ? scriptError.message
            : String(scriptError);

        if (errorMessage.includes('NOSCRIPT')) {
          this._logger.LogWarning(
            'Lua script not found in Redis, reloading...',
          );

          const loadResult = await this._client!.script(
            'LOAD',
            RATE_LIMIT_LUA_SCRIPT,
          );
          this._luaScriptSha = String(loadResult);

          // Retry with newly loaded script
          const result = await this._client!.evalsha(
            this._luaScriptSha,
            1,
            key,
            now.toString(),
            windowStart.toString(),
            limit.toString(),
            windowTtl.toString(),
          );
          count = Number(result);
        } else {
          throw scriptError;
        }
      }

      const remaining = Math.max(0, limit - count);

      return {
        count,
        limit,
        reset: resetTime,
        remaining,
      };
    } catch (error) {
      this._logger.LogError(
        `Redis rate limiting increment error for key: ${key}`,
        error,
      );
      // Fail-open: allow request on error to prevent Redis issues from blocking traffic
      return {
        count: 0,
        limit,
        reset: Math.ceil(Date.now() / 1000) + windowSeconds,
        remaining: limit,
      };
    }
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    try {
      this._ensureConnected();
      await this._client!.del(key);
    } catch (error) {
      this._logger.LogError(
        `Redis rate limiting reset error for key: ${key}`,
        error,
      );
      // Fail-open: don't throw
    }
  }

  /**
   * Get current count without incrementing
   *
   * Uses pipeline for efficiency:
   * 1. Remove expired timestamps
   * 2. Get count
   */
  async getCurrentCount(key: string, windowSeconds: number): Promise<number> {
    try {
      this._ensureConnected();

      const now = Math.floor(Date.now() / 1000);
      const windowStart = now - windowSeconds;

      // Use pipeline for atomic operations
      const pipeline = this._client!.pipeline();
      pipeline.zremrangebyscore(key, '-inf', windowStart);
      pipeline.zcard(key);

      const results = await pipeline.exec();

      if (!results || results.length < 2) {
        return 0;
      }

      return (results[1][1] as number) || 0;
    } catch (error) {
      this._logger.LogError(
        `Redis rate limiting getCurrentCount error for key: ${key}`,
        error,
      );
      return 0; // Fail-open
    }
  }
}
