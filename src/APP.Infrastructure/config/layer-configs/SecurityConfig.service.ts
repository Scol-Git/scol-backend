import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';

/**
 * Security Configuration Service
 * 
 * Provides type-safe access to security layer configuration.
 * Implements ISecurityConfig interface for dependency injection.
 * 
 * @class SecurityConfig
 * @implements {ISecurityConfig}
 */
@Injectable()
export class SecurityConfig implements ISecurityConfig {
  jwt = {
    secret: this._config.get<string>('JWT_SECRET') || 'change-me-in-production',
    accessTokenExpiresIn:
      this._config.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') || '15m',
    refreshTokenExpiresIn:
      this._config.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN') || '7d',
  };

  oauth = {
    google: {
      clientId: this._config.get<string>('GOOGLE_CLIENT_ID'),
      clientSecret: this._config.get<string>('GOOGLE_CLIENT_SECRET'),
      callbackUrl: this._config.get<string>('GOOGLE_CALLBACK_URL'),
    },
  };

  constructor(private readonly _config: ConfigService) {}
}

