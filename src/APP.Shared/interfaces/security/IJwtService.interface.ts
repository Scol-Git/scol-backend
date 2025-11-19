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
   * @returns Decoded token payload
   * @throws Error if token is invalid or expired
   */
  verifyToken(token: string): JwtPayload;

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



