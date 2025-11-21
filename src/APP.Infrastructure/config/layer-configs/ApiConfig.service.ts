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
    windowMs: this._config.get<number>('RATE_LIMIT_WINDOW_MS', 15 * 60 * 1000), // 15 minutes
    maxRequests: this._config.get<number>('RATE_LIMIT_MAX_REQUESTS', 100),
  };

  constructor(private readonly _config: ConfigService) {}
}
