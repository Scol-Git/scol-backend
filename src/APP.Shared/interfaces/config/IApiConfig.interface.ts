/**
 * API Configuration Interface
 */
export interface IApiConfig {
  cors: {
    enabled: boolean;
    origins: string[];
  };

  rateLimit: {
    enabled: boolean;
    global: {
      limit: number;
      windowSeconds: number;
    };
    ipBased: {
      limit: number;
      windowSeconds: number;
    };
    userBased: {
      limit: number;
      windowSeconds: number;
    };
    exemptUsers?: string[];
    exemptRoles?: string[];
  };

  /** Express trust proxy hop count (0 = disabled) */
  trustProxyHops: number;
}
