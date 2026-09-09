import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import type { IJwtService, IRevocationRegistry } from '@shared/interfaces/security';
import {
  IJwtService as IJwtServiceToken,
  IRevocationRegistry as IRevocationRegistryToken,
} from '@shared/tokens/injection.tokens';
import { JwtPayloadToCurrentUserMapper } from '@shared/mappers/JwtPayloadToCurrentUser.mapper';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { InvalidTokenException } from '@shared/exceptions/auth/InvalidTokenException';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(IJwtServiceToken) private readonly _jwtService: IJwtService,
    @Inject(IRevocationRegistryToken)
    private readonly _revocation: IRevocationRegistry,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this._extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      const payload = this._jwtService.verifyToken(token, 'access');

      if (payload.iat !== undefined) {
        const revoked = this._revocation.isRevoked({
          sessionId: payload.sid,
          userId: payload.sub,
          tokenIssuedAt: payload.iat,
        });
        if (revoked) {
          throw new InvalidTokenException();
        }
      }

      const currentUser = JwtPayloadToCurrentUserMapper.toCurrentUser(payload);
      (request as Request & { user: ICurrentUser }).user = currentUser;
      return true;
    } catch (error) {
      if (error instanceof InvalidTokenException) {
        throw error;
      }
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
