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
    /** Access token secret */
    accessSecret: string;
    /** Refresh token secret */
    refreshSecret: string;
    /** OTP token secret */
    otpSecret: string;
    /** Token issuer (iss claim) */
    issuer: string;
    /** Access token expiration time (e.g., '10m', '1h') */
    accessTokenExpiresIn: string;
    /** Refresh token expiration time (e.g., '7d', '30d') */
    refreshTokenExpiresIn: string;
    /** Absolute session cap (e.g. '30d') */
    sessionAbsoluteMax: string;
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
