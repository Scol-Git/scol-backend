/**
 * Infrastructure Configuration Interface
 * 
 * Defines configuration for infrastructure concerns:
 * - Database connections
 * - Email/SMTP settings
 * - Cache (Redis) settings
 * - Messaging (RabbitMQ) settings
 * 
 * @interface IInfrastructureConfig
 */
export interface IInfrastructureConfig {
  /**
   * Database configuration
   */
  database: {
    /** Database connection URL (preferred) */
    url: string;
    
    /** Database host (optional, used if URL not provided) */
    host?: string;
    
    /** Database port (optional) */
    port?: number;
    
    /** Database username (optional) */
    username?: string;
    
    /** Database password (optional) */
    password?: string;
    
    /** Database name (optional) */
    database?: string;
  };
  
  /**
   * Email configuration
   */
  email: {
    /** Email provider type */
    provider: 'console' | 'smtp';
    
    /** SMTP configuration */
    smtp: {
      host?: string;
      port?: number;
      secure?: boolean;
      user?: string;
      password?: string;
      from?: string;
    };
  };
  
  /**
   * Cache configuration
   */
  cache: {
    /** Redis connection URL (optional, falls back to in-memory) */
    redisUrl?: string;
  };
  
  /**
   * Messaging configuration
   */
  messaging: {
    /** RabbitMQ connection URL (optional) */
    rabbitmqUrl?: string;
  };
}

