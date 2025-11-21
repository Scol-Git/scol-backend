import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IApplicationConfig } from '@shared/interfaces/config/IApplicationConfig.interface';

/**
 * Application Configuration Service
 * 
 * Provides type-safe access to application/business logic layer configuration.
 * Implements IApplicationConfig interface for dependency injection.
 * 
 * @class ApplicationConfig
 * @implements {IApplicationConfig}
 */
@Injectable()
export class ApplicationConfig implements IApplicationConfig {
  auth = {
    accountLockoutThreshold: this._config.get<number>(
      'AUTH_ACCOUNT_LOCKOUT_THRESHOLD',
      5,
    ),
    accountLockoutDurationMinutes: this._config.get<number>(
      'AUTH_ACCOUNT_LOCKOUT_DURATION_MINUTES',
      30,
    ),
    refreshTokenExpirationDays: this._config.get<number>(
      'AUTH_REFRESH_TOKEN_EXPIRATION_DAYS',
      7,
    ),
    passwordResetTokenExpirationHours: this._config.get<number>(
      'AUTH_PASSWORD_RESET_TOKEN_EXPIRATION_HOURS',
      1,
    ),
  };

  pagination = {
    defaultPageSize: this._config.get<number>('PAGINATION_DEFAULT_PAGE_SIZE', 10),
    maxPageSize: this._config.get<number>('PAGINATION_MAX_PAGE_SIZE', 100),
  };

  constructor(private readonly _config: ConfigService) {}
}

