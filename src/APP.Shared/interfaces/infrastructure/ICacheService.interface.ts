/**
 * Interface for caching service (Redis implementation)
 * 
 * Provides abstraction for caching operations.
 * Following .NET's IDistributedCache pattern.
 * 
 * @interface ICacheService
 * 
 * TODO: Implement RedisCache service in Phase 3+
 */
export interface ICacheService {
  /**
   * Get value from cache by key
   * 
   * @param key - Cache key
   * @returns Cached value or null if not found
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Set value in cache with optional expiration
   * 
   * @param key - Cache key
   * @param value - Value to cache
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;

  /**
   * Remove value from cache
   * 
   * @param key - Cache key
   */
  remove(key: string): Promise<void>;

  /**
   * Check if key exists in cache
   * 
   * @param key - Cache key
   * @returns True if key exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Clear all cache entries (use with caution)
   */
  clear(): Promise<void>;

  /**
   * Get multiple values from cache
   * 
   * @param keys - Array of cache keys
   * @returns Array of cached values (nulls for missing keys)
   */
  getMany<T>(keys: string[]): Promise<(T | null)[]>;

  /**
   * Set multiple values in cache
   * 
   * @param entries - Array of key-value pairs
   * @param ttlSeconds - Time to live in seconds (optional)
   */
  setMany<T>(entries: Array<{ key: string; value: T }>, ttlSeconds?: number): Promise<void>;
}

