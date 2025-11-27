/**
 * Interface for caching service (Redis + In-Memory implementations).
 *
 * Provides abstraction for caching operations following Clean Architecture principles.
 * Inspired by .NET Core's IDistributedCache and MemoryCache patterns.
 *
 * **Key Features:**
 * - Thread-safe getOrSet() to prevent cache stampede
 * - Automatic fail-open behavior (never throws on errors)
 * - Support for namespaced keys
 * - Compression support for Redis
 *
 * @interface ICacheService
 *
 * @example
 * ```typescript
 * // Get value
 * const value = await cacheService.get<string>('user:123');
 *
 * // Set value with TTL
 * await cacheService.set('user:123', userData, 3600);
 *
 * // Get or set (thread-safe, prevents duplicate expensive operations)
 * const user = await cacheService.getOrSet(
 *   'user:123',
 *   async () => await db.findUser('123'),
 *   3600
 * );
 *
 * // Remove by prefix
 * await cacheService.clearByPrefix('user:');
 * ```
 */
export interface ICacheService {
  /**
   * Get value from cache by key.
   *
   * **Behavior:**
   * - Returns null if key not found or expired
   * - Returns null on error (fail-open)
   * - Never throws exceptions
   *
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with optional expiration.
   *
   * **Behavior:**
   * - Overwrites existing value if key exists
   * - Fails silently on error (fail-open)
   * - Never throws exceptions
   *
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Get value from cache or set it using factory function (thread-safe).
   *
   * **Thread Safety:**
   * - Multiple concurrent requests for the same key will only execute factory once
   * - Other requests wait for the same Promise to resolve
   * - Prevents cache stampede and duplicate expensive operations
   *
   * **Behavior:**
   * - Returns cached value if exists and not expired
   * - Calls factory if cache miss, stores result, and returns it
   * - On error, executes factory and returns result without caching
   * - Never throws exceptions from cache operations
   *
   * Equivalent to .NET's MemoryCache.GetOrCreate()
   *
   * @param key - Cache key
   * @param factory - Async function to generate value on cache miss
   * @param ttlSeconds - Time to live in seconds (optional)
   * @returns Cached or newly generated value
   *
   * @example
   * ```typescript
   * // Multiple concurrent calls will only hit DB once
   * const user = await cache.getOrSet(
   *   'user:123',
   *   async () => await userRepository.findById('123'),
   *   3600
   * );
   * ```
   */
  getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number,
  ): Promise<T>;

  /**
   * Remove value from cache.
   *
   * **Behavior:**
   * - Does nothing if key doesn't exist
   * - Fails silently on error (fail-open)
   * - Never throws exceptions
   *
   * @param key - Cache key
   */
  remove(key: string): Promise<void>;

  /**
   * Check if key exists in cache.
   *
   * **Behavior:**
   * - Returns false if key not found or expired
   * - Returns false on error (fail-open)
   * - Never throws exceptions
   *
   * @param key - Cache key
   * @returns True if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Clear cache entries by prefix (safer than clearing all).
   *
   * **Behavior:**
   * - Removes all keys matching the prefix
   * - For Redis: uses SCAN + DEL pattern (non-blocking)
   * - For Memory: iterates and filters keys
   * - Fails silently on error (fail-open)
   * - Never throws exceptions
   *
   * **Use Cases:**
   * - Clear all user cache: clearByPrefix('user:')
   * - Clear specific domain: clearByPrefix('myapp:prod:cache:orders:')
   *
   * @param prefix - Key prefix to match
   *
   * @example
   * ```typescript
   * // Clear all user-related cache
   * await cache.clearByPrefix('user:');
   *
   * // Clear specific organization cache
   * await cache.clearByPrefix('org:123:');
   * ```
   */
  clearByPrefix(prefix: string): Promise<void>;

  /**
   * Get multiple values from cache.
   *
   * **Behavior:**
   * - Returns null for missing or expired keys
   * - Maintains order of input keys
   * - On error, returns array of nulls (fail-open)
   * - Never throws exceptions
   *
   * @param keys - Array of cache keys
   * @returns Array of cached values (nulls for missing keys)
   */
  getMany<T>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Set multiple values in cache.
   *
   * **Behavior:**
   * - For Redis: uses pipeline for efficiency
   * - For Memory: uses synchronous loop (not Promise.all)
   * - Fails silently on error (fail-open)
   * - Never throws exceptions
   *
   * @param entries - Array of key-value pairs
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  setMany<T>(
    entries: Array<{ key: string; value: T }>,
    ttlSeconds?: number,
  ): Promise<void>;
}
