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
    accessSecret:
      this._config.get<string>('JWT_ACCESS_SECRET') ||
      this._config.get<string>('JWT_SECRET') ||
      'change-me-in-production',
    refreshSecret:
      this._config.get<string>('JWT_REFRESH_SECRET') ||
      this._config.get<string>('JWT_SECRET') ||
      'change-me-in-production',
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

  password = {
    bcryptSaltRounds: this._config.get<number>('BCRYPT_SALT_ROUNDS') ?? 12,
    minLength: this._config.get<number>('PASSWORD_MIN_LENGTH') ?? 8,
    blockCommon:
      (this._config.get<string>('PASSWORD_BLOCK_COMMON') || 'true') === 'true',
  };

  otp = {
    length: this._config.get<number>('OTP_LENGTH') ?? 6,
    ttlSeconds: this._config.get<number>('OTP_TTL_SECONDS') ?? 300,
    maxAttempts: this._config.get<number>('OTP_MAX_ATTEMPTS') ?? 3,
    resendCooldownSeconds:
      this._config.get<number>('OTP_RESEND_COOLDOWN_SECONDS') ?? 60,
    dailyLimitPerPhone: this._config.get<number>('OTP_DAILY_PHONE_LIMIT') ?? 5,
    dailyLimitPerIp: this._config.get<number>('OTP_DAILY_IP_LIMIT') ?? 20,
    redisPrefix: this._config.get<string>('REDIS_KEY_PREFIX_AUTH') || 'auth:',
  };

  constructor(private readonly _config: ConfigService) {}
}

