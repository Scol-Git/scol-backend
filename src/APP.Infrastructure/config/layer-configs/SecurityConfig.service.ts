import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import {
  assertValidJwtExpiry,
  parseJwtExpiryToSeconds,
} from '@shared/utils/jwtExpiry.util';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

const MIN_SECRET_BYTES = 32;

function readRequiredSecret(
  config: ConfigService,
  key: string,
  legacySecret?: string,
): string {
  const value = config.get<string>(key)?.trim();
  if (value && value.length >= MIN_SECRET_BYTES) {
    return value;
  }
  if (legacySecret && legacySecret.length >= MIN_SECRET_BYTES) {
    throw new Error(
      `${key} is required and must be distinct from JWT_SECRET. ` +
        `Set ${key} explicitly (minimum ${MIN_SECRET_BYTES} characters).`,
    );
  }
  throw new Error(
    `${key} is required (minimum ${MIN_SECRET_BYTES} characters).`,
  );
}

/**
 * Security Configuration Service
 *
 * Provides type-safe access to security layer configuration.
 * Validates JWT secrets and lifetimes at startup.
 */
@Injectable()
export class SecurityConfig implements ISecurityConfig, OnModuleInit {
  readonly jwt: ISecurityConfig['jwt'];
  readonly password: ISecurityConfig['password'];
  readonly otp: ISecurityConfig['otp'];

  constructor(
    private readonly _config: ConfigService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {
    const legacySecret = this._config.get<string>('JWT_SECRET')?.trim();
    const accessSecret = readRequiredSecret(
      this._config,
      'JWT_ACCESS_SECRET',
      legacySecret,
    );
    const refreshSecret = readRequiredSecret(
      this._config,
      'JWT_REFRESH_SECRET',
      legacySecret,
    );
    const otpSecret = readRequiredSecret(
      this._config,
      'JWT_OTP_SECRET',
      legacySecret,
    );

    const secrets = [accessSecret, refreshSecret, otpSecret];
    const unique = new Set(secrets);
    if (unique.size !== secrets.length) {
      throw new Error(
        'JWT_ACCESS_SECRET, JWT_REFRESH_SECRET and JWT_OTP_SECRET must be distinct.',
      );
    }

    const issuer = this._config.get<string>('JWT_ISSUER')?.trim();
    if (!issuer) {
      throw new Error('JWT_ISSUER is required.');
    }

    const accessTokenExpiresIn =
      this._config.get<string>('JWT_ACCESS_TOKEN_EXPIRES_IN') ?? '10m';
    const refreshTokenExpiresIn =
      this._config.get<string>('JWT_REFRESH_TOKEN_EXPIRES_IN') ?? '7d';
    const sessionAbsoluteMax =
      this._config.get<string>('AUTH_SESSION_ABSOLUTE_MAX') ?? '30d';

    assertValidJwtExpiry(accessTokenExpiresIn, 'JWT_ACCESS_TOKEN_EXPIRES_IN');
    assertValidJwtExpiry(refreshTokenExpiresIn, 'JWT_REFRESH_TOKEN_EXPIRES_IN');
    assertValidJwtExpiry(sessionAbsoluteMax, 'AUTH_SESSION_ABSOLUTE_MAX');

    this.jwt = {
      accessSecret,
      refreshSecret,
      otpSecret,
      issuer,
      accessTokenExpiresIn,
      refreshTokenExpiresIn,
      sessionAbsoluteMax,
    };

    this.password = {
      bcryptSaltRounds: this._config.get<number>('BCRYPT_SALT_ROUNDS') ?? 12,
      minLength: this._config.get<number>('PASSWORD_MIN_LENGTH') ?? 8,
      blockCommon:
        (this._config.get<string>('PASSWORD_BLOCK_COMMON') || 'true') === 'true',
    };

    this.otp = {
      length: this._config.get<number>('OTP_LENGTH') ?? 6,
      ttlSeconds: this._config.get<number>('OTP_TTL_SECONDS') ?? 300,
      maxAttempts: this._config.get<number>('OTP_MAX_ATTEMPTS') ?? 3,
      resendCooldownSeconds:
        this._config.get<number>('OTP_RESEND_COOLDOWN_SECONDS') ?? 60,
      maxResendPerSession:
        this._config.get<number>('OTP_MAX_RESEND_PER_SESSION') ?? 2,
      dailyLimitPerPhone: this._config.get<number>('OTP_DAILY_PHONE_LIMIT') ?? 5,
      dailyLimitPerIp: this._config.get<number>('OTP_DAILY_IP_LIMIT') ?? 20,
      redisPrefix: this._config.get<string>('REDIS_KEY_PREFIX_AUTH') || 'auth:',
    };
  }

  onModuleInit(): void {
    this.logger.LogInfo('JWT configuration loaded', {
      context: 'SecurityConfig',
      accessTokenExpiresIn: this.jwt.accessTokenExpiresIn,
      accessTokenExpiresInSeconds: parseJwtExpiryToSeconds(
        this.jwt.accessTokenExpiresIn,
      ),
      refreshTokenExpiresIn: this.jwt.refreshTokenExpiresIn,
      refreshTokenExpiresInSeconds: parseJwtExpiryToSeconds(
        this.jwt.refreshTokenExpiresIn,
      ),
      sessionAbsoluteMax: this.jwt.sessionAbsoluteMax,
      issuer: this.jwt.issuer,
    });
  }
}
