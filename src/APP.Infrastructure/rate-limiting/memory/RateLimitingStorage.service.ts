import { Injectable, OnModuleDestroy, Inject, Optional } from '@nestjs/common';
import type { IRateLimitingStorage } from '@shared/interfaces/infrastructure/IRateLimitingStorage.interface';
import { ILogger } from '@shared/tokens/injection.tokens';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';

/**
 * Rate limit entry for a key
 */
interface RateLimitEntry {
  timestamps: number[]; // Array of timestamps (Unix seconds) - NOT sorted to avoid overhead
  lastCleanup: number; // Last cleanup time in milliseconds
}

/**
 * Rate Limiting Storage Implementation (In-Memory)
 *
 * **Features:**
 * - Thread-safe sliding window algorithm
 * - NO sorting (appends only, cleans from start)
 * - Limit array growth (max 10k timestamps per key)
 * - Fast cleanup of expired timestamps
 * - Auto-cleanup of empty keys
 * - Fail-open behavior (never throws)
 *
 * **Thread Safety:**
 * - Synchronous operations (no race conditions)
 * - Atomic read-modify-write within event loop
 *
 * **Algorithm:**
 * 1. Remove expired timestamps from start of array (O(n) worst case)
 * 2. Append current timestamp (O(1))
 * 3. Count timestamps in window
 * 4. Limit array growth to prevent memory issues
 *
 * **Performance:**
 * - Append-only (no sorting overhead)
 * - Cleanup from start (expired timestamps are always at the beginning)
 * - Fast for typical rate limit scenarios (< 1000 req/window)
 *
 * **Use Cases:**
 * - Development and testing
 * - Automatic fallback when Redis is unavailable
 * - Single-instance production (not recommended for distributed systems)
 *
 * @class RateLimitingStorage
 * @implements {IRateLimitingStorage}
 */
@Injectable()
export class RateLimitingStorage
  implements IRateLimitingStorage, OnModuleDestroy
{
  private readonly _storage = new Map<string, RateLimitEntry>();
  private readonly _cleanupInterval: NodeJS.Timeout;
  private readonly _cleanupIntervalMs = 60000; // 1 minute
  private readonly _maxTimestampsPerKey = 10000; // Prevent memory issues

  constructor(
    @Inject(ILogger) @Optional() private readonly _logger?: ILoggerInterface,
  ) {
    // Cleanup expired entries periodically
    this._cleanupInterval = setInterval(() => {
      this._cleanupExpired();
    }, this._cleanupIntervalMs);
  }

  /**
   * Cleanup expired entries (entries with no recent activity)
   * Runs every 1 minute to keep memory usage low
   */
  private _cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this._storage.entries()) {
      // Remove entries that haven't been accessed in 1 hour
      if (now - entry.lastCleanup > 3600000) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this._storage.delete(key);
    }

    if (keysToDelete.length > 0 && this._logger) {
      this._logger.LogDebug?.(
        `In-memory rate limiting cleanup: removed ${keysToDelete.length} expired entries`,
      );
    }
  }

  /**
   * Remove expired timestamps from the start of the array.
   *
   * **Optimization:**
   * - NO sorting (timestamps are naturally in order as they're appended)
   * - Remove from start only (expired timestamps are always at the beginning)
   * - O(n) worst case, but typically fast for sliding windows
   *
   * **Algorithm:**
   * 1. Find first valid timestamp (> cutoff)
   * 2. Slice array from that index
   * 3. Auto-delete key if array becomes empty
   */
  private _removeExpiredTimestamps(
    key: string,
    entry: RateLimitEntry,
    windowSeconds: number,
  ): void {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - windowSeconds;

    // Find first valid timestamp (binary search not needed, just scan from start)
    let firstValidIndex = 0;
    for (let i = 0; i < entry.timestamps.length; i++) {
      if (entry.timestamps[i] > cutoff) {
        firstValidIndex = i;
        break;
      }
    }

    // Remove expired timestamps from start
    if (firstValidIndex > 0) {
      entry.timestamps = entry.timestamps.slice(firstValidIndex);
    }

    // Auto-delete key if no timestamps remain
    if (entry.timestamps.length === 0) {
      this._storage.delete(key);
    }

    entry.lastCleanup = Date.now();
  }

  /**
   * Limit array growth to prevent memory issues.
   *
   * **Behavior:**
   * - If array exceeds max size, remove oldest timestamps
   * - Prevents memory exhaustion from malicious/buggy clients
   * - Logs warning when limit is hit
   */
  private _limitArrayGrowth(entry: RateLimitEntry): void {
    if (entry.timestamps.length > this._maxTimestampsPerKey) {
      const excess = entry.timestamps.length - this._maxTimestampsPerKey;
      entry.timestamps = entry.timestamps.slice(excess);

      if (this._logger) {
        this._logger.LogWarning(
          `In-memory rate limiting: array growth limit hit, removed ${excess} old timestamps`,
        );
      }
    }
  }

  /**
   * Increment request count using sliding window algorithm (thread-safe).
   *
   * **Thread Safety:**
   * - All operations are synchronous (atomic within Node.js event loop)
   * - No race conditions in single-process environments
   *
   * **Algorithm:**
   * 1. Get or create entry
   * 2. Remove expired timestamps from start
   * 3. Append current timestamp (O(1))
   * 4. Limit array growth if needed
   * 5. Count and return result
   *
   * **Behavior:**
   * - Never throws exceptions (fail-open)
   * - On error, returns { count: 0, remaining: limit }
   */
  increment(
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
      const now = Math.floor(Date.now() / 1000);
      const resetTime = now + windowSeconds;

      // Get or create entry
      let entry = this._storage.get(key);
      if (!entry) {
        entry = {
          timestamps: [],
          lastCleanup: Date.now(),
        };
        this._storage.set(key, entry);
      }

      // Remove expired timestamps from start (NO sorting needed)
      this._removeExpiredTimestamps(key, entry, windowSeconds);

      // If entry was auto-deleted due to no timestamps, recreate it
      if (!this._storage.has(key)) {
        entry = {
          timestamps: [],
          lastCleanup: Date.now(),
        };
        this._storage.set(key, entry);
      }

      // Add current timestamp (append only, no sorting)
      entry.timestamps.push(now);

      // Limit array growth to prevent memory issues
      this._limitArrayGrowth(entry);

      // Count remaining requests in window
      const count = entry.timestamps.length;
      const remaining = Math.max(0, limit - count);

      return Promise.resolve({
        count,
        limit,
        reset: resetTime,
        remaining,
      });
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(
          `In-memory rate limiting increment error for key: ${key}`,
          error,
        );
      }
      // Fail-open: allow request on error
      return Promise.resolve({
        count: 0,
        limit,
        reset: Math.floor(Date.now() / 1000) + windowSeconds,
        remaining: limit,
      });
    }
  }

  /**
   * Reset rate limit for a key
   */
  reset(key: string): Promise<void> {
    try {
      this._storage.delete(key);
      return Promise.resolve();
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(
          `In-memory rate limiting reset error for key: ${key}`,
          error,
        );
      }
      // Fail-open: don't throw
      return Promise.resolve();
    }
  }

  /**
   * Get current count without incrementing
   */
  getCurrentCount(key: string, windowSeconds: number): Promise<number> {
    try {
      const entry = this._storage.get(key);
      if (!entry) {
        return Promise.resolve(0);
      }

      // Remove expired timestamps
      this._removeExpiredTimestamps(key, entry, windowSeconds);

      // Check if entry still exists (might have been auto-deleted)
      const updatedEntry = this._storage.get(key);
      if (!updatedEntry) {
        return Promise.resolve(0);
      }

      return Promise.resolve(updatedEntry.timestamps.length);
    } catch (error) {
      if (this._logger) {
        this._logger.LogError(
          `In-memory rate limiting getCurrentCount error for key: ${key}`,
          error,
        );
      }
      return Promise.resolve(0); // Fail-open
    }
  }

  onModuleDestroy(): void {
    if (this._cleanupInterval) {
      clearInterval(this._cleanupInterval);
    }
    this._storage.clear();
  }
}
