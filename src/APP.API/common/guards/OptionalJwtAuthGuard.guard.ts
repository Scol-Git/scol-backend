import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { Request } from 'express';
import { Inject } from '@nestjs/common';
import type { IJwtService } from '@shared/interfaces/security';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';
import { JwtPayloadToCurrentUserMapper } from '@shared/mappers/JwtPayloadToCurrentUser.mapper';
import type { ICurrentUser } from '@shared/interfaces/domain';

/**
 * Optional JWT Authentication Guard
 *
 * Allows both authenticated and anonymous requests.
 * If a valid JWT is provided, user context is populated.
 * If no JWT or invalid JWT, request proceeds without user context.
 *
 * Use this guard for endpoints that work for both:
 * - Anonymous users (limited functionality)
 * - Authenticated users (full functionality)
 *
 * @example
 * ```typescript
 * @UseGuards(OptionalJwtAuthGuard)
 * @Post()
 * async search(
 *   @CurrentUser() user?: ICurrentUser,  // May be undefined
 * ) {
 *   // Handle both cases
 * }
 * ```
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    @Inject(IJwtServiceToken) private readonly _jwtService: IJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this._extractToken(request);

    // No token = anonymous user (allowed)
    if (!token) {
      return true;
    }

    try {
      const payload = this._jwtService.verifyToken(token);

      // Reject OTP tokens
      if ((payload as any).aud === 'otp') {
        // Allow request but don't attach user
        return true;
      }

      // Convert JwtPayload to ICurrentUser
      const currentUser = JwtPayloadToCurrentUserMapper.toCurrentUser(payload);

      // Attach ICurrentUser to request
      (request as Request & { user: ICurrentUser }).user = currentUser;

      return true;
    } catch (error) {
      // Invalid token = allow but treat as anonymous
      return true;
    }
  }

  private _extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7);
  }
}
