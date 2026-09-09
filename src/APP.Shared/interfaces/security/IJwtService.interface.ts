/**
 * Interface for JWT token service.
 */
export interface IJwtService {
  generateAccessToken(payload: AccessTokenClaims): string;

  generateRefreshToken(payload: RefreshTokenClaims): string;

  verifyToken(token: string, type?: 'access' | 'refresh'): VerifiedJwtPayload;

  generateOtpToken(payload: {
    sessionId?: string;
    userId?: string;
    phone: string;
    purpose: 'phone_verify' | 'password_reset';
  }): string;

  verifyOtpToken(token: string): {
    pendingId?: string;
    userId?: string;
    phone: string;
    purpose: string;
    aud: string;
  };

  decodeToken(token: string): VerifiedJwtPayload | null;
}

export interface AccessTokenClaims {
  sub: string;
  sid: string;
  jti: string;
  orgId: string;
  email: string;
  roles: string[];
  permissions: string[];
  isSuperAdmin?: boolean;
}

export interface RefreshTokenClaims {
  sub: string;
  sid: string;
}

export interface VerifiedJwtPayload {
  sub: string;
  sid?: string;
  jti?: string;
  orgId?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  isSuperAdmin?: boolean;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
}

/** @deprecated Use AccessTokenClaims / VerifiedJwtPayload */
export type JwtPayload = VerifiedJwtPayload;
