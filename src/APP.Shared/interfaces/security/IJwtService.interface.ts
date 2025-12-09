/**
 * Interface for JWT token service.
 *
 * Provides abstraction for JWT token generation and validation.
 *
 * @interface IJwtService
 */
export interface IJwtService {
  /**
   * Generate an access token.
   *
   * @param payload - Token payload (user ID, org ID, roles, permissions, claims)
   * @returns JWT access token
   */
  generateAccessToken(payload: JwtPayload): string;

  /**
   * Generate a refresh token.
   *
   * @param payload - Token payload
   * @returns JWT refresh token
   */
  generateRefreshToken(payload: JwtPayload): string;

  /**
   * Verify and decode a token.
   *
   * @param token - JWT token
   * @param type - Token type ('access' or 'refresh')
   * @returns Decoded token payload
   * @throws Error if token is invalid or expired
   */
  verifyToken(token: string, type?: 'access' | 'refresh'): JwtPayload;

  /**
   * Generate an OTP verification token (short-lived).
   *
   * @param payload - OTP token payload (pendingId, phone, purpose)
   * @returns JWT OTP token
   */
  generateOtpToken(payload: {
    pendingId: string;
    phone: string;
    purpose: string;
  }): string;

  /**
   * Verify and decode an OTP token.
   *
   * @param token - JWT OTP token
   * @returns Decoded OTP token payload
   * @throws Error if token is invalid or expired
   */
  verifyOtpToken(token: string): {
    pendingId: string;
    phone: string;
    purpose: string;
  };

  /**
   * Decode token without verification (for inspection only).
   *
   * @param token - JWT token
   * @returns Decoded token payload or null if invalid
   */
  decodeToken(token: string): JwtPayload | null;
}

/**
 * JWT Token Payload
 */
export interface JwtPayload {
  /** User ID */
  sub: string; // Standard JWT claim for subject (user ID)

  /** Organization ID */
  orgId: string;

  /** User email */
  email: string;

  /** User roles */
  roles: string[];

  /** User permissions (from roles) */
  permissions: string[];

  /** Whether user is super admin */
  isSuperAdmin?: boolean;

  /** Issued at timestamp */
  iat?: number;

  /** Expiration timestamp */
  exp?: number;
}
