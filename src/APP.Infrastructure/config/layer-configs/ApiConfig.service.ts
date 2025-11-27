import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IApiConfig } from '@shared/interfaces/config/IApiConfig.interface';

/**
 * API Configuration Service
 *
 * Provides type-safe access to API/presentation layer configuration.
 * Implements IApiConfig interface for dependency injection.
 *
 * @class ApiConfig
 * @implements {IApiConfig}
 */
@Injectable()
export class ApiConfig implements IApiConfig {
  cors = {
    enabled: this._config.get<string>('CORS_ENABLED', 'true') === 'true',
    origins: this._config
      .get<string>('CORS_ORIGINS', '*')
      .split(',')
      .map((origin) => origin.trim()),
  };

  rateLimit = {
    enabled: this._config.get<string>('RATE_LIMIT_ENABLED', 'false') === 'true',

    global: {
      limit: this._config.get<number>('RATE_LIMIT_GLOBAL_LIMIT', 10000),
      windowSeconds: this._config.get<number>(
        'RATE_LIMIT_GLOBAL_WINDOW_SECONDS',
        60,
      ),
    },

    ipBased: {
      limit: this._config.get<number>('RATE_LIMIT_IP_LIMIT', 100),
      windowSeconds: this._config.get<number>(
        'RATE_LIMIT_IP_WINDOW_SECONDS',
        60,
      ),
    },

    userBased: {
      limit: this._config.get<number>('RATE_LIMIT_USER_LIMIT', 1000),
      windowSeconds: this._config.get<number>(
        'RATE_LIMIT_USER_WINDOW_SECONDS',
        60,
      ),
    },

    exemptUsers: this._parseCommaSeparated('RATE_LIMIT_EXEMPT_USERS'),
    exemptRoles: this._parseCommaSeparated('RATE_LIMIT_EXEMPT_ROLES'),
  };

  constructor(private readonly _config: ConfigService) {}

  /**
   * Parse comma-separated values from environment variable
   */
  private _parseCommaSeparated(envKey: string): string[] | undefined {
    const value = this._config.get<string>(envKey);
    if (!value) {
      return undefined;
    }

    const items = value
      .split(',')
      .map((item) => item.trim())
      .filter((item) => item.length > 0);

    return items.length > 0 ? items : undefined;
  }
}
