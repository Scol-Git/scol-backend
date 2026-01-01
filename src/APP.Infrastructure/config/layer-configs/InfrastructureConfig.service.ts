import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IInfrastructureConfig } from '@shared/interfaces/config/IInfrastructureConfig.interface';
import { getAppStage } from '../getAppStage';

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
  };

  cache = {
    redisUrl: this._config.get<string>('REDIS_URL') || '',
  };

  sms = {
    // Use APP_STAGE: console for dev/qa, api for prod
    provider: (this._config.get<string>('SMS_PROVIDER') ||
      (getAppStage() === 'prod' ? 'api' : 'console')) as 'console' | 'api',
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
