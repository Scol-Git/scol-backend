import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { Inject } from '@nestjs/common';
import type { IJwtService, JwtPayload } from '@shared/interfaces/security';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';

/**
 * JWT Authentication Guard
 * 
 * Validates JWT tokens and attaches user information to the request.
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
      throw new UnauthorizedException('Missing authentication token');
    }

    try {
      const payload = this._jwtService.verifyToken(token);
      
      // Attach user to request
      (request as any).user = payload;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
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

