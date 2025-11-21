import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { IAppConfig } from '@shared/interfaces/config/IAppConfig.interface';

/**
 * Application Configuration Service
 * 
 * Provides type-safe access to application configuration.
 * Implements IAppConfig interface for dependency injection.
 * 
 * @class AppConfig
 * @implements {IAppConfig}
 */
@Injectable()
export class AppConfig implements IAppConfig {
  /**
   * Authentication configuration
   */
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

  /**
   * JWT configuration
   */
  jwt = {
    accessTokenExpiresIn:
      this._config.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') || '15m',
    refreshTokenExpiresIn:
      this._config.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN') || '7d',
  };

  constructor(private readonly _config: ConfigService) {}
}

