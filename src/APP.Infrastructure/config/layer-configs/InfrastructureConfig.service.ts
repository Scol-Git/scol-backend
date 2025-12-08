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
    redisUrl:
      this._config.get<string>('REDIS_URL') ||
      this._buildRedisUrl(
        this._config.get<string>('REDIS_HOST'),
        this._config.get<number>('REDIS_PORT'),
        this._config.get<string>('REDIS_PASSWORD'),
        this._config.get<number>('REDIS_DB'),
      ),
  };

  /**
   * Build Redis URL from individual components
   * @param host Redis host (default: localhost)
   * @param port Redis port (default: 6379)
   * @param password Redis password (optional)
   * @param db Redis database number (default: 0)
   * @returns Redis connection URL or undefined if host not provided
   */
  private _buildRedisUrl(
    host?: string,
    port?: number,
    password?: string,
    db?: number,
  ): string | undefined {
    if (!host) {
      return undefined;
    }

    const _port = port || 6379;
    const _db = db || 0;
    const auth = password ? `:${password}@` : '';

    return `redis://${auth}${host}:${_port}/${_db}`;
  }

  sms = {
    provider: (this._config.get<string>('SMS_PROVIDER') ||
      (this._config.get<string>('NODE_ENV') === 'development'
        ? 'console'
        : 'api')) as 'console' | 'api',
    api: {
      url:
        this._config.get<string>('SMS_API_URL') ||
        'https://api.sms.net.bd/sendsms',
      apiKey: this._config.get<string>('SMS_API_KEY') || '',
      throwOnFailure:
        this._config.get<string>('SMS_THROW_ON_FAILURE') === 'true',
    },
  };

  constructor(private readonly _config: ConfigService) {}
}
