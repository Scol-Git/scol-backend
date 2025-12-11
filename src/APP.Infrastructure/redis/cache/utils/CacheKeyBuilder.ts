/**
 * Cache Key Builder Utility
 *
 * Provides standardized key naming conventions for caching.
 * Follows industry best practices for distributed caching.
 *
 * **Key Format:**
 * ```
 * {app}:{env}:cache:{domain}:{id}
 * ```
 *
 * **Examples:**
 * - myapp:prod:cache:user:123
 * - myapp:dev:cache:org:456:settings
 * - myapp:staging:cache:product:789
 *
 * @module CacheKeyBuilder
 */

export interface CacheKeyConfig {
  /**
   * Application name (e.g., 'myapp', 'scol')
   */
  appName: string;

  /**
   * Environment (e.g., 'dev', 'staging', 'prod')
   */
  environment: string;
}

export class CacheKeyBuilder {
  private readonly _appName: string;
  private readonly _environment: string;
  private readonly _prefix: string;

  constructor(config: CacheKeyConfig) {
    this._appName = config.appName.toLowerCase();
    this._environment = config.environment.toLowerCase();
    this._prefix = `${this._appName}:${this._environment}:cache`;
  }

  /**
   * Build a cache key with domain and ID
   *
   * @param domain - Cache domain (e.g., 'user', 'organization', 'product')
   * @param id - Entity ID or unique identifier
   * @param suffix - Optional suffix for additional specificity
   * @returns Formatted cache key
   *
   * @example
   * ```typescript
   * builder.build('user', '123'); // => 'myapp:prod:cache:user:123'
   * builder.build('user', '123', 'profile'); // => 'myapp:prod:cache:user:123:profile'
   * ```
   */
  build(domain: string, id: string | number, suffix?: string): string {
    const key = `${this._prefix}:${domain}:${id}`;
    return suffix ? `${key}:${suffix}` : key;
  }

  /**
   * Build a cache key with custom path
   *
   * @param path - Custom path components
   * @returns Formatted cache key
   *
   * @example
   * ```typescript
   * builder.buildPath('users', 'active', 'count'); // => 'myapp:prod:cache:users:active:count'
   * ```
   */
  buildPath(...path: string[]): string {
    return `${this._prefix}:${path.join(':')}`;
  }

  /**
   * Get the base prefix (useful for clearByPrefix)
   *
   * @returns Base prefix
   *
   * @example
   * ```typescript
   * builder.getPrefix(); // => 'myapp:prod:cache'
   * ```
   */
  getPrefix(): string {
    return this._prefix;
  }

  /**
   * Get domain prefix (useful for clearing all keys in a domain)
   *
   * @param domain - Cache domain
   * @returns Domain prefix
   *
   * @example
   * ```typescript
   * builder.getDomainPrefix('user'); // => 'myapp:prod:cache:user'
   * ```
   */
  getDomainPrefix(domain: string): string {
    return `${this._prefix}:${domain}`;
  }

  /**
   * Parse a cache key into its components
   *
   * @param key - Cache key to parse
   * @returns Parsed components or null if invalid
   */
  parse(key: string): {
    appName: string;
    environment: string;
    domain: string;
    id: string;
    suffix?: string;
  } | null {
    const parts = key.split(':');

    if (parts.length < 5 || parts[2] !== 'cache') {
      return null;
    }

    return {
      appName: parts[0],
      environment: parts[1],
      domain: parts[3],
      id: parts[4],
      suffix: parts.length > 5 ? parts.slice(5).join(':') : undefined,
    };
  }
}

