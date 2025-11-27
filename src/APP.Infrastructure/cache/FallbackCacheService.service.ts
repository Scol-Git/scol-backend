import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import { RedisConnectionService } from './RedisConnectionService.service';
import { CacheService as RedisCacheService } from './redis/CacheService.service';
import { CacheService as MemoryCacheService } from './memory/CacheService.service';

/**
 * Fallback Cache Service (Automatic Redis → In-Memory)
 *
 * **Features:**
 * - Automatic fallback to in-memory when Redis is unavailable
 * - Throttled logging (logs fallback warning once, not on every operation)
 * - Seamless switching between implementations
 * - Fail-open behavior (never throws)
 *
 * **Behavior:**
 * 1. Always tries Redis first
 * 2. On Redis error: automatically switches to in-memory
 * 3. Logs warning once (throttled to avoid spam)
 * 4. Continues serving with in-memory cache
 *
 * **Use Cases:**
 * - Production environments where Redis might be temporarily unavailable
 * - Graceful degradation
 * - High availability requirements
 *
 * @class FallbackCacheService
 * @implements {ICacheService}
 */
@Injectable()
export class FallbackCacheService implements ICacheService, OnModuleInit {
  private _redisCache: RedisCacheService;
  private _memoryCache: MemoryCacheService;
  private _fallbackWarningLogged = false;
  private _lastFallbackTime = 0;
  private readonly _fallbackLogThrottleMs = 60000; // Log once per minute

  constructor(
    private readonly _redisConnection: RedisConnectionService,
    @Inject(ILogger) private readonly _logger: ILoggerInterface,
  ) {
    this._redisCache = new RedisCacheService(_redisConnection, _logger);
    this._memoryCache = new MemoryCacheService(_logger);
  }

  async onModuleInit(): Promise<void> {
    await this._redisCache.onModuleInit();

    if (this._redisConnection.isAvailable) {
      this._logger.LogInfo(
        'Fallback cache service initialized: Redis (primary) + In-Memory (fallback)',
      );
    } else {
      this._logger.LogWarning(
        'Fallback cache service initialized: In-Memory only (Redis unavailable)',
      );
    }
  }

  /**
   * Log fallback warning (throttled to once per minute)
   */
  private _logFallbackWarning(operation: string): void {
    const now = Date.now();

    if (!this._fallbackWarningLogged || now - this._lastFallbackTime > this._fallbackLogThrottleMs) {
      this._logger.LogWarning(
        `Cache fallback: Redis unavailable for ${operation}, using in-memory cache`,
      );
      this._fallbackWarningLogged = true;
      this._lastFallbackTime = now;
    }
  }

  /**
   * Get current cache implementation (Redis or In-Memory)
   */
  private _getCurrentCache(): ICacheService {
    if (this._redisCache.isConnected) {
      return this._redisCache;
    }

    this._logFallbackWarning('get');
    return this._memoryCache;
  }

  async get<T>(key: string): Promise<T | null> {
    return this._getCurrentCache().get<T>(key);
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    return this._getCurrentCache().set(key, value, ttlSeconds);
  }

  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    return this._getCurrentCache().getOrSet(key, factory, ttlSeconds);
  }

  async remove(key: string): Promise<void> {
    return this._getCurrentCache().remove(key);
  }

  async exists(key: string): Promise<boolean> {
    return this._getCurrentCache().exists(key);
  }

  async clearByPrefix(prefix: string): Promise<void> {
    return this._getCurrentCache().clearByPrefix(prefix);
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    return this._getCurrentCache().getMany<T>(keys);
  }

  async setMany<T>(
    entries: Array<{ key: string; value: T }>,
    ttlSeconds?: number,
  ): Promise<void> {
    return this._getCurrentCache().setMany(entries, ttlSeconds);
  }

  /**
   * Check if currently using Redis (true) or in-memory (false)
   */
  get isUsingRedis(): boolean {
    return this._redisCache.isConnected;
  }
}

