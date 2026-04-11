import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Inject } from '@nestjs/common';
import type { IJwtService } from '@shared/interfaces/security';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';
import { JwtPayloadToCurrentUserMapper } from '@shared/mappers/JwtPayloadToCurrentUser.mapper';
import type { ICurrentUser } from '@shared/interfaces/domain';

/**
 * JWT Authentication Guard
 *
 * Validates JWT tokens and attaches user information to the request.
 * Converts JwtPayload (infrastructure) to ICurrentUser (domain) at the boundary.
 * Follows .NET Core's authentication middleware pattern.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(IJwtServiceToken) private readonly _jwtService: IJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this._extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      const payload = this._jwtService.verifyToken(token);

      // Reject OTP tokens - they should only be used with OtpJwtGuard
      if ((payload as any).aud === 'otp') {
        throw new UnauthorizedException(
          'Invalid authentication token type',
        );
      }

      // Convert JwtPayload (infrastructure) to ICurrentUser (domain) at boundary
      const currentUser = JwtPayloadToCurrentUserMapper.toCurrentUser(payload);

      // Attach ICurrentUser (not JwtPayload) to request
      (request as Request & { user: ICurrentUser }).user = currentUser;

      return true;
    } catch (error) {
      throw new UnauthorizedException('Token is invalid or expired');
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
