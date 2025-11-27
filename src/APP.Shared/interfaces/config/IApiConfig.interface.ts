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

    /** Global rate limiting configuration */
    global: {
      /** Maximum requests per window */
      limit: number;
      /** Time window in seconds */
      windowSeconds: number;
    };

    /** IP-based rate limiting (for anonymous/unauthenticated users) */
    ipBased: {
      /** Maximum requests per window */
      limit: number;
      /** Time window in seconds */
      windowSeconds: number;
    };

    /** User-based rate limiting (for authenticated users) */
    userBased: {
      /** Maximum requests per window */
      limit: number;
      /** Time window in seconds */
      windowSeconds: number;
    };

    /** User IDs exempt from rate limiting (optional) */
    exemptUsers?: string[];

    /** Role names exempt from rate limiting (optional) */
    exemptRoles?: string[];
  };
}
