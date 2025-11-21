import { Injectable, Inject } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { IJwtService, JwtPayload } from '@shared/interfaces/security';
import type { IAppConfig } from '@shared/interfaces/config/IAppConfig.interface';
import { IAppConfig as IAppConfigToken } from '@shared/tokens/injection.tokens';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Service
 *
 * Provides JWT token generation and validation.
 *
 * @class JwtService
 * @implements {IJwtService}
 */
@Injectable()
export class JwtService implements IJwtService {
  private readonly secret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor(
    private readonly _config: ConfigService,
    @Inject(IAppConfigToken) private readonly _appConfig: IAppConfig,
  ) {
    this.secret =
      this._config.get<string>('JWT_SECRET') || 'change-me-in-production';
    this.accessTokenExpiresIn = this._appConfig.jwt.accessTokenExpiresIn;
    this.refreshTokenExpiresIn = this._appConfig.jwt.refreshTokenExpiresIn;
  }

  generateAccessToken(payload: JwtPayload): string {
    const tokenPayload: Record<string, any> = {
      sub: payload.sub,
      orgId: payload.orgId,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
      isSuperAdmin: payload.isSuperAdmin || false,
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: this.accessTokenExpiresIn,
    } as SignOptions);
  }

  generateRefreshToken(payload: JwtPayload): string {
    const tokenPayload: Record<string, any> = {
      sub: payload.sub,
      orgId: payload.orgId,
      email: payload.email,
    };

    return jwt.sign(tokenPayload, this.secret, {
      expiresIn: this.refreshTokenExpiresIn,
    } as SignOptions);
  }

  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.secret) as jwt.JwtPayload;

      return {
        sub: decoded.sub as string,
        orgId: decoded.orgId as string,
        email: decoded.email as string,
        roles: (decoded.roles as string[]) || [],
        permissions: (decoded.permissions as string[]) || [],
        isSuperAdmin: decoded.isSuperAdmin as boolean | undefined,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      throw new Error(
        `Invalid token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as jwt.JwtPayload | null;

      if (!decoded) {
        return null;
      }

      return {
        sub: decoded.sub as string,
        orgId: decoded.orgId as string,
        email: decoded.email as string,
        roles: (decoded.roles as string[]) || [],
        permissions: (decoded.permissions as string[]) || [],
        isSuperAdmin: decoded.isSuperAdmin as boolean | undefined,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch {
      return null;
    }
  }
}
