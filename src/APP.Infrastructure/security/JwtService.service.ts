import { Injectable, Inject } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { IJwtService, JwtPayload } from '@shared/interfaces/security';
import type { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISecurityConfig as ISecurityConfigToken } from '@shared/tokens/injection.tokens';

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
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor(
    @Inject(ISecurityConfigToken) private readonly _config: ISecurityConfig,
  ) {
    this.accessSecret = _config.jwt.accessSecret || _config.jwt.secret;
    this.refreshSecret = _config.jwt.refreshSecret || _config.jwt.secret;
    this.accessTokenExpiresIn = _config.jwt.accessTokenExpiresIn;
    this.refreshTokenExpiresIn = _config.jwt.refreshTokenExpiresIn;
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

    return jwt.sign(tokenPayload, this.accessSecret, {
      expiresIn: this.accessTokenExpiresIn,
    } as SignOptions);
  }

  generateRefreshToken(payload: JwtPayload): string {
    const tokenPayload: Record<string, any> = {
      sub: payload.sub,
      orgId: payload.orgId,
      email: payload.email,
    };

    return jwt.sign(tokenPayload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    } as SignOptions);
  }

  verifyToken(token: string, type: 'access' | 'refresh' = 'access'): JwtPayload {
    const secret = type === 'access' ? this.accessSecret : this.refreshSecret;
    try {
      const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

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
