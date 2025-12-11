/**
 * Rate Limit Key Builder Utility
 *
 * Provides standardized key naming conventions for rate limiting.
 * Follows industry best practices for distributed rate limiting.
 *
 * **Key Format:**
 * ```
 * {app}:{env}:ratelimit:{type}:{id}:{path}
 * ```
 *
 * **Examples:**
 * - myapp:prod:ratelimit:user:123:/api/organizations
 * - myapp:dev:ratelimit:ip:192.168.1.1:/api/auth/login
 * - myapp:staging:ratelimit:org:456:/api/uploads
 *
 * @module RateLimitKeyBuilder
 */

export interface RateLimitKeyConfig {
  /**
   * Application name (e.g., 'myapp', 'scol')
   */
  appName: string;

  /**
   * Environment (e.g., 'dev', 'staging', 'prod')
   */
  environment: string;
}

export class RateLimitKeyBuilder {
  private readonly _appName: string;
  private readonly _environment: string;
  private readonly _prefix: string;

  constructor(config: RateLimitKeyConfig) {
    this._appName = config.appName.toLowerCase();
    this._environment = config.environment.toLowerCase();
    this._prefix = `${this._appName}:${this._environment}:ratelimit`;
  }

  /**
   * Build a rate limit key
   *
   * @param type - Rate limit type (e.g., 'user', 'ip', 'org', 'api')
   * @param id - Identifier (user ID, IP address, org ID, etc.)
   * @param path - API path or resource identifier
   * @returns Formatted rate limit key
   *
   * @example
   * ```typescript
   * builder.build('user', '123', '/api/organizations');
   * // => 'myapp:prod:ratelimit:user:123:/api/organizations'
   * ```
   */
  build(type: string, id: string, path: string): string {
    return `${this._prefix}:${type}:${id}:${path}`;
  }

  /**
   * Build a rate limit key with custom segments
   *
   * @param segments - Custom path segments
   * @returns Formatted rate limit key
   *
   * @example
   * ```typescript
   * builder.buildPath('global', 'api', 'uploads');
   * // => 'myapp:prod:ratelimit:global:api:uploads'
   * ```
   */
  buildPath(...segments: string[]): string {
    return `${this._prefix}:${segments.join(':')}`;
  }

  /**
   * Get the base prefix (useful for clearing all rate limits)
   *
   * @returns Base prefix
   *
   * @example
   * ```typescript
   * builder.getPrefix(); // => 'myapp:prod:ratelimit'
   * ```
   */
  getPrefix(): string {
    return this._prefix;
  }

  /**
   * Get type prefix (useful for clearing all rate limits of a type)
   *
   * @param type - Rate limit type
   * @returns Type prefix
   *
   * @example
   * ```typescript
   * builder.getTypePrefix('user'); // => 'myapp:prod:ratelimit:user'
   * ```
   */
  getTypePrefix(type: string): string {
    return `${this._prefix}:${type}`;
  }

  /**
   * Parse a rate limit key into its components
   *
   * @param key - Rate limit key to parse
   * @returns Parsed components or null if invalid
   */
  parse(key: string): {
    appName: string;
    environment: string;
    type: string;
    id: string;
    path: string;
  } | null {
    const parts = key.split(':');

    if (parts.length < 6 || parts[2] !== 'ratelimit') {
      return null;
    }

    return {
      appName: parts[0],
      environment: parts[1],
      type: parts[3],
      id: parts[4],
      path: parts.slice(5).join(':'),
    };
  }
}

