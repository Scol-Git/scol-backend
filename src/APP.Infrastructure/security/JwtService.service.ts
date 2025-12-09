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
 * Supports both access/refresh tokens and OTP verification tokens.
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
  private readonly otpTtl: number;

  constructor(
    @Inject(ISecurityConfigToken) private readonly _config: ISecurityConfig,
  ) {
    this.accessSecret = _config.jwt.accessSecret || _config.jwt.secret;
    this.refreshSecret = _config.jwt.refreshSecret || _config.jwt.secret;
    this.accessTokenExpiresIn = _config.jwt.accessTokenExpiresIn;
    this.refreshTokenExpiresIn = _config.jwt.refreshTokenExpiresIn;
    this.otpTtl = _config.otp.ttlSeconds;
  }

  generateAccessToken(payload: JwtPayload): string {
    const tokenPayload: Record<string, any> = {
      sub: payload.sub,
      orgId: payload.orgId,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
      isSuperAdmin: payload.isSuperAdmin || false,
      aud: 'access', // Audience for access tokens
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
      aud: 'refresh', // Audience for refresh tokens
    };

    return jwt.sign(tokenPayload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    } as SignOptions);
  }

  verifyToken(
    token: string,
    type: 'access' | 'refresh' = 'access',
  ): JwtPayload {
    const secret = type === 'access' ? this.accessSecret : this.refreshSecret;
    try {
      const decoded = jwt.verify(token, secret) as jwt.JwtPayload;

      // Validate audience
      const expectedAud = type;
      if (decoded.aud && decoded.aud !== expectedAud) {
        throw new Error(
          `Invalid token type. Expected ${expectedAud}, got ${decoded.aud}`,
        );
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

  /**
   * Generate OTP verification token
   * Short-lived token used for phone verification flow
   *
   * @param payload OTP token payload
   * @returns JWT token string
   */
  generateOtpToken(payload: {
    pendingId: string;
    phone: string;
    purpose: 'phone_verify';
  }): string {
    const tokenPayload: Record<string, any> = {
      sub: payload.pendingId,
      phone: payload.phone,
      purpose: payload.purpose,
      aud: 'otp', // Audience for OTP tokens
    };

    return jwt.sign(tokenPayload, this.accessSecret, {
      expiresIn: this.otpTtl, // Use OTP TTL in seconds
    } as SignOptions);
  }

  /**
   * Verify OTP token
   *
   * @param token OTP JWT token
   * @returns Decoded OTP payload
   * @throws Error if token is invalid or not an OTP token
   */
  verifyOtpToken(token: string): {
    pendingId: string;
    phone: string;
    purpose: string;
    aud: string;
  } {
    try {
      const decoded = jwt.verify(token, this.accessSecret) as jwt.JwtPayload;

      // Validate audience
      if (decoded.aud !== 'otp') {
        throw new Error('Invalid token type. Expected OTP token.');
      }

      // Validate purpose
      if (decoded.purpose !== 'phone_verify') {
        throw new Error('Invalid OTP token purpose.');
      }

      return {
        pendingId: decoded.sub as string,
        phone: decoded.phone as string,
        purpose: decoded.purpose as string,
        aud: decoded.aud as string,
      };
    } catch (error) {
      throw new Error(
        `Invalid OTP token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
