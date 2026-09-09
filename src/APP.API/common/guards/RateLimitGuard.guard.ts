import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import type { IApiConfig } from '@shared/interfaces/config/IApiConfig.interface';
import type { IRateLimitingStorage } from '@shared/interfaces/infrastructure/IRateLimitingStorage.interface';
import type { ICurrentUser } from '@shared/interfaces/domain';
import type { ILogger } from '@shared/interfaces/logging';
import {
  IApiConfig as IApiConfigToken,
  IRateLimitingStorage as IRateLimitingStorageToken,
  ILogger as ILoggerToken,
} from '@shared/tokens/injection.tokens';
import {
  RATE_LIMIT_KEY,
  SKIP_RATE_LIMIT_KEY,
  RateLimitOptions,
} from '../decorators/RateLimit.decorator';

/**
 * Rate Limit Guard
 *
 * Implements rate limiting using sliding window algorithm with Redis.
 * Supports:
 * - Global, IP-based, and user-based rate limits
 * - Per-endpoint configuration via @RateLimit decorator
 * - Skip rate limiting via @SkipRateLimiting decorator
 * - Exempt users and roles
 *
 * Configuration priority:
 * 1. Endpoint-specific (@RateLimit decorator)
 * 2. User-based (for authenticated users)
 * 3. IP-based (for anonymous users)
 * 4. Global (overall API protection)
 *
 * @class RateLimitGuard
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly _reflector: Reflector,
    @Inject(IApiConfigToken) private readonly _apiConfig: IApiConfig,
    @Inject(IRateLimitingStorageToken)
    private readonly _storage: IRateLimitingStorage,
    @Inject(ILoggerToken) private readonly _logger: ILogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: ICurrentUser }>();
    const response = context.switchToHttp().getResponse<Response>();

    // 1. Check if rate limiting is enabled
    if (!this._apiConfig.rateLimit.enabled) {
      return true;
    }

    // 2. Check if route should be skipped (via @SkipRateLimiting decorator)
    const shouldSkip = this._reflector.getAllAndOverride<boolean>(
      SKIP_RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (shouldSkip) {
      return true;
    }

    // 3. Check if user is exempt
    if (request.user && this._isUserExempt(request.user)) {
      return true;
    }

    // 4. Get endpoint-specific configuration (from @RateLimit decorator)
    const endpointConfig = this._reflector.getAllAndOverride<RateLimitOptions>(
      RATE_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 5. Determine identifier (user ID or IP address)
    const identifier = this._getIdentifier(request);
    const routePath = request.path;

    // 6. Resolve rate limit configuration
    const { limit, windowSeconds } = this._resolveRateLimitConfig(
      endpointConfig,
      !!request.user,
    );

    // 7. Generate rate limit key
    const rateLimitKey = this._generateRateLimitKey(identifier, routePath);

    // 8. Check rate limit
    const result = await this._storage.increment(
      rateLimitKey,
      windowSeconds,
      limit,
    );

    // 9. Set rate limit headers (always set, even if limit not exceeded)
    this._setRateLimitHeaders(response, result);

    // 10. Check if limit exceeded
    if (result.count > limit) {
      const retryAfter = result.reset - Math.floor(Date.now() / 1000);

      // Log rate limit violation
      this._logger.LogWarning('Rate limit exceeded', {
        identifier,
        routePath,
        count: result.count,
        limit,
        windowSeconds,
      });

      // Throw 429 Too Many Requests
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Check if user is exempt from rate limiting
   */
  private _isUserExempt(user: ICurrentUser): boolean {
    const { exemptUsers, exemptRoles } = this._apiConfig.rateLimit;

    // Check user ID exemption
    if (exemptUsers && exemptUsers.includes(user.userId)) {
      return true;
    }

    // Check role exemption
    if (exemptRoles && user.roles && user.roles.length > 0) {
      const userRoleNames = user.roles.map((role) => role.toLowerCase());
      const hasExemptRole = exemptRoles.some((role) =>
        userRoleNames.includes(role.toLowerCase()),
      );
      if (hasExemptRole) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get identifier for rate limiting (user ID or IP address)
   */
  private _getIdentifier(request: Request & { user?: ICurrentUser }): string {
    if (request.user) {
      return `user:${request.user.userId}`;
    }

    const ip = request.ip || request.socket.remoteAddress || 'unknown';
    return `ip:${ip}`;
  }

  /**
   * Resolve rate limit configuration based on priority
   */
  private _resolveRateLimitConfig(
    endpointConfig: RateLimitOptions | undefined,
    isAuthenticated: boolean,
  ): { limit: number; windowSeconds: number } {
    // Priority 1: Endpoint-specific configuration (from @RateLimit decorator)
    if (endpointConfig) {
      return {
        limit: endpointConfig.limit,
        windowSeconds: endpointConfig.windowSeconds,
      };
    }

    // Priority 2: User-based (for authenticated users)
    if (isAuthenticated) {
      return {
        limit: this._apiConfig.rateLimit.userBased.limit,
        windowSeconds: this._apiConfig.rateLimit.userBased.windowSeconds,
      };
    }

    // Priority 3: IP-based (for anonymous users)
    return {
      limit: this._apiConfig.rateLimit.ipBased.limit,
      windowSeconds: this._apiConfig.rateLimit.ipBased.windowSeconds,
    };
  }

  /**
   * Generate rate limit key
   *
   * Note: The 'ratelimit:' prefix is added by the storage implementation
   * (manually in Redis implementation, no prefix needed in memory implementation)
   */
  private _generateRateLimitKey(identifier: string, routePath: string): string {
    // Format: identifier:routePath
    // Example: "user:123:/api/organizations" or "ip:192.168.1.1:/api/auth/login"
    // Redis implementation will prefix with 'ratelimit:' automatically
    return `${identifier}:${routePath}`;
  }

  /**
   * Set standard rate limit headers on response
   */
  private _setRateLimitHeaders(
    response: Response,
    result: { count: number; limit: number; reset: number; remaining: number },
  ): void {
    response.setHeader('X-RateLimit-Limit', result.limit.toString());
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader('X-RateLimit-Reset', result.reset.toString());
    response.setHeader('X-RateLimit-Used', result.count.toString());
  }
}
