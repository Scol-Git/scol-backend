/**
 * Security Configuration Interface
 *
 * Defines configuration for security concerns:
 * - JWT token settings
 * - OAuth provider settings
 *
 * @interface ISecurityConfig
 */
export interface ISecurityConfig {
  /**
   * JWT configuration
   */
  jwt: {
    /** Shared secret (legacy fallback) */
    secret: string;
    /** Access token secret (preferred; falls back to secret) */
    accessSecret: string;
    /** Refresh token secret (preferred; falls back to secret) */
    refreshSecret: string;
    /** Access token expiration time (e.g., '15m', '1h') */
    accessTokenExpiresIn: string;
    /** Refresh token expiration time (e.g., '7d', '30d') */
    refreshTokenExpiresIn: string;
  };

  /**
   * Password and hashing settings
   */
  password: {
    bcryptSaltRounds: number;
    minLength: number;
    blockCommon: boolean;
  };

  /**
   * OTP settings
   */
  otp: {
    length: number;
    ttlSeconds: number;
    maxAttempts: number;
    resendCooldownSeconds: number;
    maxResendPerSession: number;
    dailyLimitPerPhone: number;
    dailyLimitPerIp: number;
    redisPrefix: string;
  };
}
