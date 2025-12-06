import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IInfrastructureConfig } from '@shared/interfaces/config/IInfrastructureConfig.interface';

/**
 * Infrastructure Configuration Service
 *
 * Provides type-safe access to infrastructure layer configuration.
 * Implements IInfrastructureConfig interface for dependency injection.
 *
 * @class InfrastructureConfig
 * @implements {IInfrastructureConfig}
 */
@Injectable()
export class InfrastructureConfig implements IInfrastructureConfig {
  database = {
    url: this._config.get<string>('DATABASE_URL') || '',
    host: this._config.get<string>('DB_HOST'),
    port: this._config.get<number>('DB_PORT'),
    username: this._config.get<string>('DB_USER'),
    password: this._config.get<string>('DB_PASS'),
    database: this._config.get<string>('DB_NAME'),
  };

  email = {
    provider: (this._config.get<string>('EMAIL_PROVIDER') || 'console') as
      | 'console'
      | 'smtp',
    smtp: {
      host: this._config.get<string>('SMTP_HOST'),
      port: this._config.get<number>('SMTP_PORT'),
      secure:
        this._config.get<string>('SMTP_SECURE') === 'true' ||
        this._config.get<boolean>('SMTP_SECURE') === true,
      user: this._config.get<string>('SMTP_USER'),
      password: this._config.get<string>('SMTP_PASS'),
      from: this._config.get<string>('SMTP_FROM'),
    },
  };

  cache = {
    redisUrl: this._config.get<string>('REDIS_URL'),
  };

  constructor(private readonly _config: ConfigService) {}
}
