import { SetMetadata } from '@nestjs/common';
import type { Request } from 'express';

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

  /**
   * Optional custom bucket identifier (e.g. account:phone).
   * Combined with the route path as `{id}:{path}`.
   */
  keyGenerator?: (request: Request) => string;
}

/**
 * Rate Limit Decorator
 *
 * Configures rate limiting for a specific endpoint or controller.
 * Overrides global rate limit settings for the decorated route.
 */
export const RateLimit = (options: RateLimitOptions) =>
  SetMetadata(RATE_LIMIT_KEY, options);

/**
 * Skip Rate Limiting Decorator
 *
 * Exempts a specific endpoint or controller from rate limiting.
 */
export const SkipRateLimiting = () => SetMetadata(SKIP_RATE_LIMIT_KEY, true);
