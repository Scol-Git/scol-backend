/**
 * API Configuration Interface
 * 
 * Defines configuration for API/presentation layer concerns:
 * - CORS settings
 * - Rate limiting
 * - API versioning
 * 
 * @interface IApiConfig
 */
export interface IApiConfig {
  /**
   * CORS configuration
   */
  cors: {
    /** Whether CORS is enabled */
    enabled: boolean;
    
    /** Allowed origins */
    origins: string[];
  };
  
  /**
   * Rate limiting configuration
   */
  rateLimit: {
    /** Whether rate limiting is enabled */
    enabled: boolean;
    
    /** Time window in milliseconds */
    windowMs: number;
    
    /** Maximum requests per window */
    maxRequests: number;
  };
}

