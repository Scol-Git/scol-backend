import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key for rate limit configuration
 */
export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Metadata key for skipping rate limiting
 */
export const SKIP_RATE_LIMIT_KEY = 'skipRateLimit';

/**
 * Rate limit configuration options
 */
export interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;

  /** Time window in seconds */
  windowSeconds: number;

  /** Optional custom key generator function */
  keyGenerator?: (request: any) => string;
}

/**
 * Rate Limit Decorator
 *
 * Configures rate limiting for a specific endpoint or controller.
 * Overrides global rate limit settings for the decorated route.
 *
 * @param options - Rate limit configuration options
 *
 * @example
 * ```typescript
 * @Get('/organizations')
 * @UseGuards(RateLimitGuard)
 * @RateLimit({ limit: 50, windowSeconds: 60 })
 * getOrganizations() {
 *   // Maximum 50 requests per minute
 * }
 *
 * @Post('/auth/login')
 * @UseGuards(RateLimitGuard)
 * @RateLimit({ limit: 5, windowSeconds: 60 })
 * login() {
 *   // Maximum 5 requests per minute (brute force protection)
 * }
 * ```
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Skip Rate Limiting Decorator
 *
 * Exempts a specific endpoint or controller from rate limiting.
 * When applied, the route will bypass all rate limit checks.
 *
 * @example
 * ```typescript
 * @Get('/health')
 * @UseGuards(RateLimitGuard)
 * @SkipRateLimiting()
 * healthCheck() {
 *   // This endpoint will not be rate limited
 * }
 * ```
 */
export const SkipRateLimiting = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
