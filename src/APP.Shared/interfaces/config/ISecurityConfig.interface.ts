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
    /** JWT secret key for signing tokens */
    secret: string;
    
    /** Access token expiration time (e.g., '15m', '1h') */
    accessTokenExpiresIn: string;
    
    /** Refresh token expiration time (e.g., '7d', '30d') */
    refreshTokenExpiresIn: string;
  };
  
  /**
   * OAuth configuration
   */
  oauth: {
    /** Google OAuth settings */
    google?: {
      clientId?: string;
      clientSecret?: string;
      callbackUrl?: string;
    };
  };
}

