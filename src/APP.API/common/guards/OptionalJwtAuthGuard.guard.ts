import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import type { IJwtService, IRevocationRegistry } from '@shared/interfaces/security';
import {
  IJwtService as IJwtServiceToken,
  IRevocationRegistry as IRevocationRegistryToken,
  ILogger as ILoggerToken,
} from '@shared/tokens/injection.tokens';
import { JwtPayloadToCurrentUserMapper } from '@shared/mappers/JwtPayloadToCurrentUser.mapper';
import type { ICurrentUser } from '@shared/interfaces/domain';
import type { ILogger } from '@shared/interfaces/logging';

@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    @Inject(IJwtServiceToken) private readonly _jwtService: IJwtService,
    @Inject(IRevocationRegistryToken)
    private readonly _revocation: IRevocationRegistry,
    @Inject(ILoggerToken) private readonly _logger: ILogger,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this._extractToken(request);

    if (!token) {
      return true;
    }

    try {
      const payload = this._jwtService.verifyToken(token, 'access');

      if ((payload as { aud?: string }).aud === 'otp') {
        this._logger.LogInfo('Optional auth: OTP token rejected', {
          context: 'OptionalJwtAuthGuard',
        });
        return true;
      }

      if (payload.iat !== undefined) {
        const revoked = this._revocation.isRevoked({
          sessionId: payload.sid,
          userId: payload.sub,
          tokenIssuedAt: payload.iat,
        });
        if (revoked) {
          this._logger.LogInfo('Optional auth: revoked token treated as anonymous', {
            context: 'OptionalJwtAuthGuard',
            userId: payload.sub,
            sessionId: payload.sid,
          });
          return true;
        }
      }

      const currentUser = JwtPayloadToCurrentUserMapper.toCurrentUser(payload);
      (request as Request & { user: ICurrentUser }).user = currentUser;
      return true;
    } catch (error) {
      this._logger.LogInfo('Optional auth: invalid token treated as anonymous', {
        context: 'OptionalJwtAuthGuard',
        reason: error instanceof Error ? error.message : 'unknown',
      });
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
