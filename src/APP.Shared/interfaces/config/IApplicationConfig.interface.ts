/**
 * Application Configuration Interface
 * 
 * Defines configuration for application/business logic layer concerns:
 * - Authentication settings
 * - Pagination defaults
 * - Business rules and thresholds
 * 
 * @interface IApplicationConfig
 */
export interface IApplicationConfig {
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
   * Pagination configuration
   */
  pagination: {
    /** Default page size when not specified */
    defaultPageSize: number;
    
    /** Maximum allowed page size */
    maxPageSize: number;
  };

  /**
   * Wishlist (favourite courses) configuration
   */
  wishlist: {
    /** Maximum number of wishlisted course intakes per LEAD user */
    perUserLimit: number;
  };
}

