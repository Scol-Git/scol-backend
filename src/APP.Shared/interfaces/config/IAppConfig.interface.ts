/**
 * Application Configuration Interface
 *
 * Defines the structure of application configuration.
 * Used for type-safe configuration access throughout the application.
 *
 * @interface IAppConfig
 */
export interface IAppConfig {
  /**
   * Authentication configuration
   */
  auth: {
    /** Number of failed login attempts before account lockout */
    accountLockoutThreshold: number;

    /** Duration in minutes that account remains locked after lockout */
    accountLockoutDurationMinutes: number;

    /** Number of days before refresh token expires */
    refreshTokenExpirationDays: number;

    /** Number of hours before password reset token expires */
    passwordResetTokenExpirationHours: number;
  };

  /**
   * JWT configuration
   */
  jwt: {
    /** Access token expiration time (e.g., '15m', '1h') */
    accessTokenExpiresIn: string;

    /** Refresh token expiration time (e.g., '7d', '30d') */
    refreshTokenExpiresIn: string;
  };
}
