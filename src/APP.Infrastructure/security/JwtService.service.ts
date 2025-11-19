import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { IJwtService, JwtPayload } from '@shared/interfaces/security';

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

  constructor(private readonly _config: ConfigService) {
    this.secret =
      this._config.get<string>('JWT_SECRET') || 'change-me-in-production';
    this.accessTokenExpiresIn =
      this._config.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') || '15m';
    this.refreshTokenExpiresIn =
      this._config.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN') || '7d';
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
