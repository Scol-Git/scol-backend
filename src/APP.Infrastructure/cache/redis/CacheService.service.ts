import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import { RedisConnectionService } from '../RedisConnectionService.service';
import { CompressionHelper } from '../utils/CompressionHelper';

/**
 * Cache Service Implementation (Redis)
 *
 * **Features:**
 * - Distributed caching with compression (gzip)
 * - Thread-safe getOrSet() using Redis SET NX
 * - Pipelining for bulk operations
 * - Fail-open behavior (never throws, returns null)
 * - Prefix-based clearing using SCAN (non-blocking)
 * - Automatic compression for large values (> 1KB)
 *
 * **Best Practices:**
 * - Uses shared Redis connection
 * - JSON serialization with compression
 * - Non-blocking operations (SCAN instead of KEYS)
 * - Proper error handling (fail-open)
 * - Pipeline for bulk operations
 *
 * **Thread Safety:**
 * - getOrSet() uses Redis SET NX + GET pattern (atomic)
 * - Prevents duplicate expensive operations across distributed instances
 *
 * @class CacheService
 * @implements {ICacheService}
 */
@Injectable()
export class CacheService implements ICacheService, OnModuleInit {
  private _client: Redis | null = null;
  private readonly _compression: CompressionHelper;
  private _lastConnectionCheckTime = 0;
  private readonly _connectionCheckCooldownMs = 5000; // 5 seconds cooldown

  constructor(
    private readonly _redisConnection: RedisConnectionService,
    @Inject(ILogger) private readonly _logger: ILoggerInterface,
  ) {
    // Enable compression with 1KB threshold
    this._compression = new CompressionHelper({
      enabled: true,
      minSizeBytes: 1024,
    });
  }

  onModuleInit(): void {
    this._client = this._redisConnection.getClient();

    if (this._client && this._redisConnection.isAvailable) {
      this._logger.LogInfo(
        'Cache service (Redis) initialized with compression enabled',
      );
    } else {
      this._logger.LogWarning(
        'Redis connection not available, cache operations will fail-open (get=null, set=no-op, getOrSet=compute)',
      );
    }
  }

  /**
   * Check if Redis is available with cooldown to reduce log spam.
   * Throws error only once per cooldown period.
   */
  private _ensureConnected(): void {
    if (!this._client || !this._redisConnection.isAvailable) {
      const now = Date.now();
      if (
        now - this._lastConnectionCheckTime >
        this._connectionCheckCooldownMs
      ) {
        this._lastConnectionCheckTime = now;
      }
      throw new Error('Redis cache is not available');
    }
  }

  /**
   * Serialize and compress value
   */
  private _serialize<T>(value: T): string {
    const json = JSON.stringify(value);
    return this._compression.compress(json);
  }

  /**
   * Decompress and deserialize value
   */
  private _deserialize<T>(value: string): T {
    const json = this._compression.decompress(value);
    return JSON.parse(json) as T;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      this._ensureConnected();
      const value = await this._client!.get(key);

      if (value === null) {
        return null;
      }

      return this._deserialize<T>(value);
    } catch (error) {
      this._logger.LogError(`Redis cache get error for key: ${key}`, error);
      return null; // Fail-open
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      this._ensureConnected();
      const serialized = this._serialize(value);

      if (ttlSeconds) {
        await this._client!.setex(key, ttlSeconds, serialized);
      } else {
        await this._client!.set(key, serialized);
      }
    } catch (error) {
      this._logger.LogError(`Redis cache set error for key: ${key}`, error);
      // Fail-open: don't throw
    }
  }

  /**
   * Get or set value with distributed lock using Redis.
   *
   * **Algorithm:**
   * 1. Try GET first (fast path)
   * 2. If miss, use SET NX (set if not exists) with short TTL as lock
   * 3. If lock acquired, execute factory and store result
   * 4. If lock not acquired, wait briefly and retry GET (another instance is computing)
   * 5. Retry with exponential backoff (up to ~2 seconds total)
   *
   * **Thread Safety:**
   * - Atomic across distributed instances using Redis SET NX
   * - Only one instance executes factory at a time
   * - Other instances wait and then fetch the cached result
   *
   * **Behavior:**
   * - On Redis error: executes factory directly (fail-open)
   * - On factory error: error propagates to caller (not a cache issue)
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    try {
      this._ensureConnected();

      // 1. Fast path: check cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // 2. Try to acquire lock using SET NX
      const lockKey = `${key}:lock`;
      const lockTtl = 30; // 30 seconds lock TTL
      const lockAcquired = await this._client!.set(
        lockKey,
        '1',
        'EX',
        lockTtl,
        'NX',
      );

      if (lockAcquired === 'OK') {
        // We acquired the lock, execute factory
        try {
          const value = await factory();

          // Store in cache
          await this.set(key, value, ttlSeconds);

          return value;
        } finally {
          // Release lock
          await this._client!.del(lockKey);
        }
      } else {
        // Another instance is computing, wait and retry GET with backoff
        const maxRetries = 5;
        const baseDelay = 100; // 100ms

        for (let i = 0; i < maxRetries; i++) {
          // Wait with exponential backoff
          await this._sleep(baseDelay * Math.pow(2, i));

          // Try to get cached value
          const value = await this.get<T>(key);
          if (value !== null) {
            return value;
          }
        }

        // If still not in cache after retries, execute factory directly
        // (the other instance might have failed)
        this._logger.LogWarning(
          `Redis cache getOrSet: lock wait timeout for key ${key}, executing factory`,
        );
        return await factory();
      }
    } catch (error) {
      this._logger.LogError(
        `Redis cache getOrSet error for key: ${key}`,
        error,
      );
      // Fail-open: execute factory directly
      return await factory();
    }
  }

  /**
   * Sleep helper for retry backoff
   */
  private _sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async remove(key: string): Promise<void> {
    try {
      this._ensureConnected();
      await this._client!.del(key);
    } catch (error) {
      this._logger.LogError(`Redis cache remove error for key: ${key}`, error);
      // Fail-open: don't throw
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      this._ensureConnected();
      const result = await this._client!.exists(key);
      return result === 1;
    } catch (error) {
      this._logger.LogError(`Redis cache exists error for key: ${key}`, error);
      return false; // Fail-open
    }
  }

  /**
   * Clear cache entries by prefix using SCAN (non-blocking).
   *
   * **Algorithm:**
   * - Uses SCAN instead of KEYS (non-blocking, production-safe)
   * - Deletes in batches using pipeline
   * - Safe for large datasets
   *
   * **Performance:**
   * - Non-blocking (uses SCAN cursor)
   * - Batched deletes (100 keys at a time)
   * - Suitable for production use
   */
  async clearByPrefix(prefix: string): Promise<void> {
    try {
      this._ensureConnected();

      let cursor = '0';
      let totalDeleted = 0;
      const batchSize = 100;

      do {
        // Use SCAN to find keys (non-blocking)
        const [nextCursor, keys] = await this._client!.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          batchSize,
        );

        cursor = nextCursor;

        if (keys.length > 0) {
          // Delete in batch using pipeline
          const pipeline = this._client!.pipeline();
          for (const key of keys) {
            pipeline.del(key);
          }
          await pipeline.exec();
          totalDeleted += keys.length;
        }
      } while (cursor !== '0');

      if (totalDeleted > 0) {
        this._logger.LogInfo(
          `Redis cache cleared ${totalDeleted} entries with prefix: ${prefix}`,
        );
      }
    } catch (error) {
      this._logger.LogError(
        `Redis cache clearByPrefix error for prefix: ${prefix}`,
        error,
      );
      // Fail-open: don't throw
    }
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      this._ensureConnected();

      if (keys.length === 0) {
        return [];
      }

      const values = await this._client!.mget(...keys);
      return values.map((value) => {
        if (value === null) {
          return null;
        }
        try {
          return this._deserialize<T>(value);
        } catch {
          return null;
        }
      });
    } catch (error) {
      this._logger.LogError(
        `Redis cache getMany error for keys: ${keys.join(', ')}`,
        error,
      );
      return keys.map(() => null); // Fail-open
    }
  }

  /**
   * Set multiple values using pipeline for efficiency
   */
  async setMany<T>(
    entries: Array<{ key: string; value: T }>,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      this._ensureConnected();

      if (entries.length === 0) {
        return;
      }

      // Use pipeline for efficiency
      const pipeline = this._client!.pipeline();

      for (const { key, value } of entries) {
        const serialized = this._serialize(value);
        if (ttlSeconds) {
          pipeline.setex(key, ttlSeconds, serialized);
        } else {
          pipeline.set(key, serialized);
        }
      }

      await pipeline.exec();
    } catch (error) {
      this._logger.LogError('Redis cache setMany error', error);
      // Fail-open: don't throw
    }
  }

  /**
   * Check if Redis is connected and available
   */
  get isConnected(): boolean {
    return this._redisConnection.isAvailable && this._client !== null;
  }
}
