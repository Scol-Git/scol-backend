import { Injectable, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';

interface CacheEntry<T> {
  value: T;
  expiresAt?: number;
}

/**
 * Cache Service Implementation (In-Memory)
 *
 * **Features:**
 * - Thread-safe getOrSet() with concurrency locks (prevents cache stampede)
 * - Optional LRU eviction support
 * - Fast TTL cleanup (every 10 seconds)
 * - Fail-open behavior (never throws)
 * - Prefix-based clearing
 *
 * **Thread Safety:**
 * - Maintains internal locks map to prevent duplicate expensive operations
 * - Multiple concurrent requests for same key only execute factory once
 * - Lock is automatically released after completion
 *
 * **Use Cases:**
 * - Development and testing
 * - Automatic fallback when Redis is unavailable
 * - Single-instance production (not recommended for distributed systems)
 *
 * @class CacheService
 * @implements {ICacheService}
 */
@Injectable()
export class CacheService implements ICacheService, OnModuleDestroy {
  private readonly _cache = new Map<string, CacheEntry<any>>();
  private readonly _locks = new Map<string, Promise<any>>();
  private readonly _cleanupInterval: NodeJS.Timeout;
  private readonly _maxEntries: number;
  private readonly _cleanupIntervalMs = 10000; // 10 seconds for fast cleanup

  constructor(
    @Inject(ILogger) @Optional() private readonly _logger?: ILoggerInterface,
  ) {
    // Support for optional LRU (max 10,000 entries by default)
    this._maxEntries = 10000;

    // Fast cleanup of expired entries (every 10 seconds)
    this._cleanupInterval = setInterval(() => {
      this._cleanupExpired();
    }, this._cleanupIntervalMs);
  }

  /**
   * Cleanup expired entries
   * Runs every 10 seconds to keep memory usage low
   */
  private _cleanupExpired(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this._cache.entries()) {
      if (entry.expiresAt && entry.expiresAt < now) {
        this._cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0 && this._logger) {
      this._logger.LogDebug?.(
        `In-memory cache cleanup: removed ${cleanedCount} expired entries`,
      );
    }
  }

  /**
   * Evict oldest entry if cache size exceeds limit (LRU)
   * Map maintains insertion order, so first entry is oldest
   */
  private _evictIfNeeded(): void {
    if (this._cache.size >= this._maxEntries) {
      const firstKey = this._cache.keys().next().value;
      if (firstKey !== undefined) {
        this._cache.delete(firstKey);
        if (this._logger) {
          this._logger.LogDebug?.(
            `In-memory cache LRU eviction: removed key ${firstKey}`,
          );
        }
      }
    }
  }

  /**
   * Check if entry is expired
   */
  private _isExpired(entry: CacheEntry<any>): boolean {
    return entry.expiresAt !== undefined && entry.expiresAt < Date.now();
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const entry = this._cache.get(key);

      if (!entry) {
        return null;
      }

      // Check if expired
      if (this._isExpired(entry)) {
        this._cache.delete(key);
        return null;
      }

      return entry.value as T;
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(`In-memory cache get error for key: ${key}`, error);
      }
      return null; // Fail-open
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      // Evict if needed (LRU)
      this._evictIfNeeded();

      const entry: CacheEntry<T> = {
        value,
        expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined,
      };

      this._cache.set(key, entry);
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(`In-memory cache set error for key: ${key}`, error);
      }
      // Fail-open: don't throw
    }
  }

  /**
   * Get or set value with thread-safe concurrency lock.
   *
   * **Thread Safety:**
   * - Multiple concurrent calls with same key will only execute factory once
   * - Other calls wait for the same Promise to resolve
   * - Lock is automatically removed after completion
   *
   * **Implementation:**
   * 1. Check cache - return if exists and not expired
   * 2. Check if lock exists - wait for existing Promise if yes
   * 3. Create new lock Promise, execute factory
   * 4. Store result in cache
   * 5. Remove lock
   * 6. Return result
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T> {
    try {
      // 1. Check cache first
      const cached = await this.get<T>(key);
      if (cached !== null) {
        return cached;
      }

      // 2. Check if there's already a lock (another request is fetching)
      const existingLock = this._locks.get(key);
      if (existingLock) {
        // Wait for the existing request to complete
        return await existingLock;
      }

      // 3. Create new lock and execute factory
      const lockPromise = (async () => {
        try {
          const value = await factory();

          // Store in cache
          await this.set(key, value, ttlSeconds);

          return value;
        } finally {
          // Always remove lock, even on error
          this._locks.delete(key);
        }
      })();

      // Store lock so other concurrent requests can wait
      this._locks.set(key, lockPromise);

      // Wait for completion
      return await lockPromise;
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(
          `In-memory cache getOrSet error for key: ${key}`,
          error,
        );
      }
      // On cache error, execute factory directly (fail-open)
      // This ensures the application continues working even if cache fails
      return await factory();
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this._cache.delete(key);
      // Also remove any pending lock
      this._locks.delete(key);
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(`In-memory cache remove error for key: ${key}`, error);
      }
      // Fail-open: don't throw
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const entry = this._cache.get(key);

      if (!entry) {
        return false;
      }

      // Check if expired
      if (this._isExpired(entry)) {
        this._cache.delete(key);
        return false;
      }

      return true;
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(`In-memory cache exists error for key: ${key}`, error);
      }
      return false; // Fail-open
    }
  }

  /**
   * Clear cache entries by prefix (safer than clearing all)
   *
   * Iterates through all keys and removes matching ones.
   * More efficient than Array.from() + filter.
   */
  async clearByPrefix(prefix: string): Promise<void> {
    try {
      const keysToDelete: string[] = [];

      // Find all keys matching prefix
      for (const key of this._cache.keys()) {
        if (key.startsWith(prefix)) {
          keysToDelete.push(key);
        }
      }

      // Delete matching keys
      for (const key of keysToDelete) {
        this._cache.delete(key);
        this._locks.delete(key); // Also remove locks
      }

      if (this._logger && keysToDelete.length > 0) {
        this._logger.LogInfo(
          `In-memory cache cleared ${keysToDelete.length} entries with prefix: ${prefix}`,
        );
      }
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(
          `In-memory cache clearByPrefix error for prefix: ${prefix}`,
          error,
        );
      }
      // Fail-open: don't throw
    }
  }

  async getMany<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      // Use synchronous loop instead of Promise.all for better performance
      // (in-memory operations are fast, no benefit from parallelization)
      const results: (T | null)[] = [];
      for (const key of keys) {
        results.push(await this.get<T>(key));
      }
      return results;
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(`In-memory cache getMany error`, error);
      }
      return keys.map(() => null); // Fail-open
    }
  }

  async setMany<T>(
    entries: Array<{ key: string; value: T }>,
    ttlSeconds?: number,
  ): Promise<void> {
    try {
      // Use synchronous loop instead of Promise.all
      // More predictable and avoids unnecessary overhead for in-memory operations
      for (const { key, value } of entries) {
        await this.set(key, value, ttlSeconds);
      }
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(`In-memory cache setMany error`, error);
      }
      // Fail-open: don't throw
    }
  }

  onModuleDestroy(): void {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    this._cache.clear();
    this._locks.clear();
  }
}

