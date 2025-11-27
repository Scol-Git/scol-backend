import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import type { IRateLimitingStorage } from '@shared/interfaces/infrastructure/IRateLimitingStorage.interface';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import { RedisConnectionService } from '../cache/RedisConnectionService.service';
import { RateLimitingStorage as RedisRateLimitingStorage } from './redis/RateLimitingStorage.service';
import { RateLimitingStorage as MemoryRateLimitingStorage } from './memory/RateLimitingStorage.service';

/**
 * Fallback Rate Limiting Storage (Automatic Redis → In-Memory)
 *
 * **Features:**
 * - Automatic fallback to in-memory when Redis is unavailable
 * - Throttled logging (logs fallback warning once, not on every operation)
 * - Seamless switching between implementations
 * - Fail-open behavior (never blocks requests)
 *
 * **Behavior:**
 * 1. Always tries Redis first (distributed rate limiting)
 * 2. On Redis error: automatically switches to in-memory
 * 3. Logs warning once (throttled to avoid spam)
 * 4. Continues serving with in-memory rate limiting
 *
 * **Important:**
 * - In-memory fallback is per-instance (not distributed)
 * - In distributed systems, each instance has separate counters when using fallback
 * - Rate limits may be less strict when using fallback
 *
 * **Use Cases:**
 * - Production environments where Redis might be temporarily unavailable
 * - Graceful degradation
 * - Preventing complete service outage due to rate limiting failures
 *
 * @class FallbackRateLimitingStorage
 * @implements {IRateLimitingStorage}
 */
@Injectable()
export class FallbackRateLimitingStorage
  implements IRateLimitingStorage, OnModuleInit
{
  private _redisStorage: RedisRateLimitingStorage;
  private _memoryStorage: MemoryRateLimitingStorage;
  private _fallbackWarningLogged = false;
  private _lastFallbackTime = 0;
  private readonly _fallbackLogThrottleMs = 60000; // Log once per minute

  constructor(
    private readonly _redisConnection: RedisConnectionService,
    @Inject(ILogger) private readonly _logger: ILoggerInterface,
  ) {
    this._redisStorage = new RedisRateLimitingStorage(
      _redisConnection,
      _logger,
    );
    this._memoryStorage = new MemoryRateLimitingStorage(_logger);
  }

  async onModuleInit(): Promise<void> {
    await this._redisStorage.onModuleInit();

    if (this._redisConnection.isAvailable) {
      this._logger.LogInfo(
        'Fallback rate limiting initialized: Redis (primary) + In-Memory (fallback)',
      );
    } else {
      this._logger.LogWarning(
        'Fallback rate limiting initialized: In-Memory only (Redis unavailable)',
      );
    }
  }

  /**
   * Log fallback warning (throttled to once per minute)
   */
  private _logFallbackWarning(operation: string): void {
    const now = Date.now();

    if (
      !this._fallbackWarningLogged ||
      now - this._lastFallbackTime > this._fallbackLogThrottleMs
    ) {
      this._logger.LogWarning(
        `Rate limiting fallback: Redis unavailable for ${operation}, using in-memory (per-instance, not distributed)`,
      );
      this._fallbackWarningLogged = true;
      this._lastFallbackTime = now;
    }
  }

  /**
   * Get current storage implementation (Redis or In-Memory)
   */
  private _getCurrentStorage(): IRateLimitingStorage {
    if (this._redisConnection.isAvailable) {
      return this._redisStorage;
    }

    this._logFallbackWarning('increment');
    return this._memoryStorage;
  }

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
    return this._getCurrentStorage().increment(key, windowSeconds, limit);
  }

  async reset(key: string): Promise<void> {
    return this._getCurrentStorage().reset(key);
  }

  async getCurrentCount(key: string, windowSeconds: number): Promise<number> {
    return this._getCurrentStorage().getCurrentCount(key, windowSeconds);
  }

  /**
   * Check if currently using Redis (true) or in-memory (false)
   */
  get isUsingRedis(): boolean {
    return this._redisConnection.isAvailable;
  }
}

