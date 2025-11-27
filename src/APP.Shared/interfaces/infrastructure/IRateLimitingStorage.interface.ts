/**
 * Interface for rate limiting storage (Redis + In-Memory implementations).
 *
 * Provides abstraction for rate limiting operations using sliding window algorithm.
 * Follows Clean Architecture principles (Port/Adapter pattern).
 *
 * **Key Features:**
 * - Atomic operations via Lua scripts (Redis)
 * - Thread-safe sliding window (In-Memory)
 * - Automatic fail-open behavior (never blocks on errors)
 * - Support for namespaced keys
 *
 * **Key Naming Convention:**
 * ```
 * {app}:{env}:ratelimit:{type}:{id}:{path}
 * Example: myapp:prod:ratelimit:user:123:/api/organizations
 * ```
 *
 * @interface IRateLimitingStorage
 *
 * @example
 * ```typescript
 * // Increment request count for a key
 * const result = await storage.increment(
 *   'myapp:prod:ratelimit:user:123:/api/organizations',
 *   60,
 *   100
 * );
 *
 * // Check if limit exceeded
 * if (result.count > result.limit) {
 *   throw new TooManyRequestsException();
 * }
 * ```
 */
export interface IRateLimitingStorage {
  /**
   * Increment request count for a key using sliding window algorithm.
   *
   * **Algorithm:**
   * - Redis: Uses Lua script with sorted set for atomic operations
   * - Memory: Uses array of timestamps with efficient cleanup
   *
   * **Thread Safety:**
   * - Redis: Atomic via Lua script
   * - Memory: Synchronized access to prevent race conditions
   *
   * **Behavior:**
   * - Adds current timestamp to sliding window
   * - Removes timestamps outside window
   * - Returns count, remaining, reset time
   * - On error: fails open (returns { count: 0, remaining: limit })
   * - Never throws exceptions
   *
   * @param key - Rate limit key (e.g., 'myapp:prod:ratelimit:user:123:/api/orgs')
   * @param windowSeconds - Time window in seconds
   * @param limit - Maximum requests allowed in the window
   * @returns Object with current count, limit, reset timestamp, and remaining
   */
  increment(
    key: string,
    windowSeconds: number,
    limit: number,
  ): Promise<{
    count: number; // Current request count in the window
    limit: number; // Maximum requests allowed in the window
    reset: number; // Unix timestamp in seconds when the window resets
    remaining: number; // Remaining requests allowed (max 0)
  }>;

  /**
   * Reset rate limit for a key (useful for testing or manual resets).
   *
   * **Behavior:**
   * - Removes all tracking data for the key
   * - Does nothing if key doesn't exist
   * - Fails silently on error (fail-open)
   * - Never throws exceptions
   *
   * @param key - Rate limit key to reset
   */
  reset(key: string): Promise<void>;

  /**
   * Get current count for a key without incrementing.
   *
   * **Behavior:**
   * - Returns count of requests in current window
   * - Cleans up expired timestamps
   * - Returns 0 if key doesn't exist
   * - Returns 0 on error (fail-open)
   * - Never throws exceptions
   *
   * @param key - Rate limit key
   * @param windowSeconds - Time window in seconds
   * @returns Current count or 0 if key doesn't exist
   */
  getCurrentCount(key: string, windowSeconds: number): Promise<number>;
}
