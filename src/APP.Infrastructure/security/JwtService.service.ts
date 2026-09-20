import { Injectable, Inject, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { SignOptions, JwtPayload as JsonJwtPayload } from 'jsonwebtoken';
import type {
  IJwtService,
  AccessTokenClaims,
  RefreshTokenClaims,
  VerifiedJwtPayload,
} from '@shared/interfaces/security';
import type { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISecurityConfig as ISecurityConfigToken } from '@shared/tokens/injection.tokens';
import { InvalidTokenException } from '@shared/exceptions/auth/InvalidTokenException';

const ALGORITHM = 'HS256' as const;

@Injectable()
export class JwtService implements IJwtService, OnModuleInit, OnModuleDestroy {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly otpSecret: string;
  private readonly issuer: string;
  private readonly accessTokenExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;
  private readonly otpTtl: number;

  constructor(
    @Inject(ISecurityConfigToken) private readonly _config: ISecurityConfig,
  ) {
    this.accessSecret = _config.jwt.accessSecret;
    this.refreshSecret = _config.jwt.refreshSecret;
    this.otpSecret = _config.jwt.otpSecret;
    this.issuer = _config.jwt.issuer;
    this.accessTokenExpiresIn = _config.jwt.accessTokenExpiresIn;
    this.refreshTokenExpiresIn = _config.jwt.refreshTokenExpiresIn;
    this.otpTtl = _config.otp.ttlSeconds;
  }

  onModuleInit(): void {
    // no-op; SecurityConfig logs lifetimes
  }

  onModuleDestroy(): void {
    // no-op
  }

  generateAccessToken(payload: AccessTokenClaims): string {
    const tokenPayload: Record<string, unknown> = {
      sub: payload.sub,
      sid: payload.sid,
      jti: payload.jti,
      orgId: payload.orgId,
      email: payload.email,
      roles: payload.roles,
      permissions: payload.permissions,
      isSuperAdmin: payload.isSuperAdmin ?? false,
      aud: 'access',
      iss: this.issuer,
    };

    return jwt.sign(tokenPayload, this.accessSecret, {
      expiresIn: this.accessTokenExpiresIn,
      algorithm: ALGORITHM,
    } as SignOptions);
  }

  generateRefreshToken(payload: RefreshTokenClaims): string {
    const tokenPayload: Record<string, unknown> = {
      sub: payload.sub,
      sid: payload.sid,
      aud: 'refresh',
      iss: this.issuer,
    };

    return jwt.sign(tokenPayload, this.refreshSecret, {
      expiresIn: this.refreshTokenExpiresIn,
      algorithm: ALGORITHM,
    } as SignOptions);
  }

  verifyToken(
    token: string,
    type: 'access' | 'refresh' = 'access',
  ): VerifiedJwtPayload {
    const secret = type === 'access' ? this.accessSecret : this.refreshSecret;
    try {
      const decoded = jwt.verify(token, secret, {
        algorithms: [ALGORITHM],
        issuer: this.issuer,
      }) as JsonJwtPayload;

      const expectedAud = type;
      if (decoded.aud !== expectedAud) {
        throw new InvalidTokenException('Invalid token type');
      }

      if (!decoded.sub || typeof decoded.sub !== 'string') {
        throw new InvalidTokenException('Token missing subject');
      }

      if (!decoded.sid || typeof decoded.sid !== 'string') {
        throw new InvalidTokenException('Token missing session identifier');
      }

      if (type === 'access') {
        if (!decoded.jti || typeof decoded.jti !== 'string') {
          throw new InvalidTokenException('Token missing jti');
        }
      }

      if (decoded.exp === undefined || decoded.iat === undefined) {
        throw new InvalidTokenException('Token missing expiration');
      }

      return {
        sub: decoded.sub,
        sid: decoded.sid as string,
        jti: decoded.jti as string | undefined,
        orgId: decoded.orgId as string | undefined,
        email: decoded.email as string | undefined,
        roles: (decoded.roles as string[]) ?? [],
        permissions: (decoded.permissions as string[]) ?? [],
        isSuperAdmin: decoded.isSuperAdmin as boolean | undefined,
        iss: decoded.iss as string | undefined,
        aud: decoded.aud as string | undefined,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      if (error instanceof InvalidTokenException) {
        throw error;
      }
      throw new InvalidTokenException();
    }
  }

  decodeToken(token: string): VerifiedJwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JsonJwtPayload | null;
      if (!decoded || !decoded.sub) {
        return null;
      }
      return {
        sub: decoded.sub,
        sid: decoded.sid as string | undefined,
        jti: decoded.jti as string | undefined,
        orgId: decoded.orgId as string | undefined,
        email: decoded.email as string | undefined,
        roles: (decoded.roles as string[]) ?? [],
        permissions: (decoded.permissions as string[]) ?? [],
        isSuperAdmin: decoded.isSuperAdmin as boolean | undefined,
        iss: decoded.iss as string | undefined,
        aud: decoded.aud as string | undefined,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch {
      return null;
    }
  }

  generateOtpToken(payload: {
    sessionId?: string;
    userId?: string;
    phone: string;
    purpose: 'phone_verify' | 'password_reset';
  }): string {
    const tokenPayload: Record<string, unknown> = {
      sub: payload.sessionId || payload.userId,
      phone: payload.phone,
      purpose: payload.purpose,
      aud: 'otp',
      iss: this.issuer,
    };

    return jwt.sign(tokenPayload, this.otpSecret, {
      expiresIn: this.otpTtl,
      algorithm: ALGORITHM,
    } as SignOptions);
  }

  verifyOtpToken(token: string): {
    pendingId?: string;
    userId?: string;
    phone: string;
    purpose: string;
    aud: string;
  } {
    try {
      const decoded = jwt.verify(token, this.otpSecret, {
        algorithms: [ALGORITHM],
        issuer: this.issuer,
      }) as JsonJwtPayload;

      if (decoded.aud !== 'otp') {
        throw new InvalidTokenException('Invalid OTP token type');
      }

      const validPurposes = ['phone_verify', 'password_reset'];
      if (
        !decoded.purpose ||
        !validPurposes.includes(decoded.purpose as string)
      ) {
        throw new InvalidTokenException('Invalid OTP token purpose');
      }

      const result: {
        pendingId?: string;
        userId?: string;
        phone: string;
        purpose: string;
        aud: string;
      } = {
        phone: decoded.phone as string,
        purpose: decoded.purpose as string,
        aud: decoded.aud as string,
      };

      if (decoded.purpose === 'phone_verify') {
        result.pendingId = decoded.sub as string;
      } else if (decoded.purpose === 'password_reset') {
        result.userId = decoded.sub as string;
      }

      return result;
    } catch (error) {
      if (error instanceof InvalidTokenException) {
        throw error;
      }
      throw new InvalidTokenException('Invalid OTP verification token');
    }
  }
}
