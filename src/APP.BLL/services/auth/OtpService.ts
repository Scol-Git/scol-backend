import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ICacheService } from '@shared/interfaces/infrastructure';
import { ICacheService as ICacheServiceToken } from '@shared/tokens/injection.tokens';
import { IPasswordHasher } from '@shared/interfaces/security';
import { IPasswordHasher as IPasswordHasherToken } from '@shared/tokens/injection.tokens';
import { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISecurityConfig as ISecurityConfigToken } from '@shared/tokens/injection.tokens';
import { IRateLimitingStorage } from '@shared/interfaces/infrastructure';
import { IRateLimitingStorage as IRateLimitingStorageToken } from '@shared/tokens/injection.tokens';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { InvalidOtpException } from '@shared/exceptions/auth/InvalidOtpException';
import { OtpExpiredException } from '@shared/exceptions/auth/OtpExpiredException';
import { OtpAttemptsExceededException } from '@shared/exceptions/auth/OtpAttemptsExceededException';
import { ResendCooldownException } from '@shared/exceptions/auth/ResendCooldownException';
import { BusinessException } from '@shared/exceptions/BusinessException';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { PendingRegistration } from '@entity/entities/PendingRegistration.entity';

interface OtpCacheData {
  pendingId: string;
  otpHash: string;
  attempts: number;
  createdAt: number;
}

interface PendingRegistrationData {
  pendingId: string;
  passwordHash: string;
  fullName: string;
  attemptCount: number;
  resendCount: number;
  expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * OTP Service
 *
 * Manages OTP generation, verification, and rate limiting.
 * Uses cache for OTP storage and rate limiting storage for cooldowns and daily limits.
 */
@Injectable()
export class OtpService {
  private readonly otpLength: number;
  private readonly otpTtl: number;
  private readonly maxAttempts: number;
  private readonly resendCooldown: number;
  private readonly dailyLimitPerPhone: number;
  private readonly dailyLimitPerIp: number;
  private readonly redisPrefix: string;

  constructor(
    @Inject(ICacheServiceToken) private readonly cache: ICacheService,
    @Inject(IPasswordHasherToken) private readonly hasher: IPasswordHasher,
    @Inject(ISecurityConfigToken) private readonly config: ISecurityConfig,
    @Inject(IRateLimitingStorageToken)
    private readonly rateLimiter: IRateLimitingStorage,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    private readonly db: AppDbContext,
  ) {
    this.otpLength = config.otp.length;
    this.otpTtl = config.otp.ttlSeconds;
    this.maxAttempts = config.otp.maxAttempts;
    this.resendCooldown = config.otp.resendCooldownSeconds;
    this.dailyLimitPerPhone = config.otp.dailyLimitPerPhone;
    this.dailyLimitPerIp = config.otp.dailyLimitPerIp;
    this.redisPrefix = config.otp.redisPrefix;
  }

  /**
   * Generate random numeric OTP
   */
  private generateOtp(): string {
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Generate and store OTP in cache
   * @param pendingId Pending Registration ID
   * @param phone Phone number
   * @returns Plain OTP string (for sending via SMS)
   */
  async generateAndStoreOtp(pendingId: string, phone: string): Promise<string> {
    const otp = this.generateOtp();
    const otpHash = await this.hasher.hash(otp);

    const cacheData: OtpCacheData = {
      pendingId,
      otpHash,
      attempts: 0,
      createdAt: Date.now(),
    };

    const key = this.getOtpCacheKey(phone);
    await this.cache.set(key, JSON.stringify(cacheData), this.otpTtl);

    return otp;
  }

  /**
   * Verify OTP
   * @param phone Phone number
   * @param otp OTP to verify
   * @returns Pending Registration ID if verification successful
   * @throws InvalidOtpException, OtpExpiredException, OtpAttemptsExceededException
   */
  async verifyOtp(phone: string, otp: string): Promise<{ pendingId: string }> {
    const key = this.getOtpCacheKey(phone);
    const cached = await this.cache.get(key);

    if (!cached) {
      throw new OtpExpiredException();
    }

    const data: OtpCacheData = JSON.parse(cached as string);

    // Check attempts
    if (data.attempts >= this.maxAttempts) {
      await this.cache.remove(key);
      throw new OtpAttemptsExceededException(this.maxAttempts);
    }

    // Verify OTP
    const isValid = await this.hasher.verify(otp, data.otpHash);

    if (!isValid) {
      // Increment attempts
      data.attempts++;
      await this.cache.set(key, JSON.stringify(data), this.otpTtl);
      throw new InvalidOtpException();
    }

    // Success - delete OTP from cache
    await this.cache.remove(key);

    return { pendingId: data.pendingId };
  }

  /**
   * Delete OTP from cache
   * @param phone Phone number
   */
  async deleteOtp(phone: string): Promise<void> {
    const key = this.getOtpCacheKey(phone);
    await this.cache.remove(key);
  }

  /**
   * Check if OTP can be resent (rate limiting)
   * Uses IRateLimitingStorage for distributed rate limiting
   * @param phone Phone number
   * @param ip Client IP address
   * @throws ResendCooldownException, BusinessException
   */
  async canResendOtp(phone: string, ip: string): Promise<void> {
    // 1. Check resend cooldown (e.g., 60 seconds between resends)
    const cooldownKey = `otp:resend:${phone}`;
    const cooldownResult = await this.rateLimiter.increment(
      cooldownKey,
      this.resendCooldown,
      1, // Allow only 1 resend per window
    );

    if (cooldownResult.count > 1) {
      const retryAfter = cooldownResult.reset - Math.floor(Date.now() / 1000);
      throw new ResendCooldownException(retryAfter);
    }

    // 2. Check daily limit per phone (e.g., 5 OTPs per day per phone)
    const phoneDailyKey = `otp:daily:phone:${phone}`;
    const phoneResult = await this.rateLimiter.increment(
      phoneDailyKey,
      86400, // 24 hours
      this.dailyLimitPerPhone,
    );

    if (phoneResult.count > this.dailyLimitPerPhone) {
      throw new BusinessException(
        `Daily OTP limit exceeded for this phone number. Please try again tomorrow.`,
        'OTP_DAILY_LIMIT_PHONE',
      );
    }

    // 3. Check daily limit per IP (e.g., 20 OTPs per day per IP)
    const ipDailyKey = `otp:daily:ip:${ip}`;
    const ipResult = await this.rateLimiter.increment(
      ipDailyKey,
      86400,
      this.dailyLimitPerIp,
    );

    if (ipResult.count > this.dailyLimitPerIp) {
      throw new BusinessException(
        `Daily OTP limit exceeded from your IP address. Please try again tomorrow.`,
        'OTP_DAILY_LIMIT_IP',
      );
    }
  }

  /**
   * Get OTP cache key
   */
  private getOtpCacheKey(phone: string): string {
    return `${this.redisPrefix}phone_verify:${phone}`;
  }

  /**
   * Get pending registration cache key
   */
  private getPendingCacheKey(phone: string): string {
    return `pending:${phone}`;
  }

  /**
   * Save or update pending registration (Redis-first with DB fallback)
   *
   * Strategy:
   * 1. Try Redis first - check for existing pending registration
   * 2. If Redis data exists and not expired → update it
   * 3. If Redis data exists but expired → delete it, treat as new
   * 4. If Redis fails or returns null → fallback to DB
   * 5. Return pendingId (from Redis UUID or DB id)
   *
   * @param phone Phone number
   * @param passwordHash Hashed password
   * @param fullName User's full name
   * @param expiresAt Expiration timestamp (Date object)
   * @returns Pending registration ID (UUID for Redis, DB id for fallback)
   */
  async savePending(
    phone: string,
    passwordHash: string,
    fullName: string,
    expiresAt: Date,
  ): Promise<string> {
    const redisKey = this.getPendingCacheKey(phone);
    const expiresAtTimestamp = expiresAt.getTime();
    const now = Date.now();
    const ttlSeconds = 300; // 5 minutes (EX 300)

    // Try Redis first
    try {
      const cached = await this.cache.get<string>(redisKey);

      if (cached) {
        const data: PendingRegistrationData = JSON.parse(cached);

        // Check if expired
        if (data.expiresAt > now) {
          // Update existing (not expired)
          const updated: PendingRegistrationData = {
            pendingId: data.pendingId, // Keep existing pendingId
            passwordHash,
            fullName,
            attemptCount: data.attemptCount,
            resendCount: data.resendCount,
            expiresAt: expiresAtTimestamp,
          };

          await this.cache.set(redisKey, JSON.stringify(updated), ttlSeconds);

          this.logger.LogInfo('Pending registration updated in Redis', {
            context: 'OtpService.savePending',
            phone: phone.substring(0, 3) + '***',
            pendingId: data.pendingId,
            action: 'PENDING_UPDATED_REDIS',
          });

          return data.pendingId;
        } else {
          // Expired - delete from Redis
          await this.cache.remove(redisKey);
          this.logger.LogInfo('Expired pending registration removed from Redis', {
            context: 'OtpService.savePending',
            phone: phone.substring(0, 3) + '***',
            action: 'PENDING_EXPIRED_REDIS',
          });
        }
      }

      // Create new in Redis
      const newPendingId = randomUUID();
      const newData: PendingRegistrationData = {
        pendingId: newPendingId,
        passwordHash,
        fullName,
        attemptCount: 0,
        resendCount: 0,
        expiresAt: expiresAtTimestamp,
      };

      await this.cache.set(redisKey, JSON.stringify(newData), ttlSeconds);

      this.logger.LogInfo('Pending registration created in Redis', {
        context: 'OtpService.savePending',
        phone: phone.substring(0, 3) + '***',
        pendingId: newPendingId,
        action: 'PENDING_CREATED_REDIS',
      });

      return newPendingId;
    } catch (error) {
      // Redis failed - fallback to DB
      this.logger.LogError(
        'Redis operation failed, falling back to database',
        error as Error,
        {
          context: 'OtpService.savePending',
          phone: phone.substring(0, 3) + '***',
          action: 'REDIS_FALLBACK_DB',
        },
      );

      return await this.savePendingToDb(phone, passwordHash, fullName, expiresAt);
    }
  }

  /**
   * Fallback: Save pending registration to database
   * Mirrors the same logic as Redis but uses PostgreSQL
   */
  private async savePendingToDb(
    phone: string,
    passwordHash: string,
    fullName: string,
    expiresAt: Date,
  ): Promise<string> {
    // Check for existing pending registration in DB
    let pending: PendingRegistration | null =
      await this.db.pendingRegistrations.findOne({
        where: { phone },
      });

    if (pending) {
      // Check if expired
      if (pending.expiresAt < new Date()) {
        // Delete expired pending registration
        await this.db.pendingRegistrations.remove(pending);
        pending = null;
        this.logger.LogInfo('Expired pending registration removed from DB', {
          context: 'OtpService.savePendingToDb',
          phone: phone.substring(0, 3) + '***',
          action: 'PENDING_EXPIRED_DB',
        });
      } else {
        // Update existing pending registration
        pending.passwordHash = passwordHash;
        pending.fullName = fullName;
        pending.expiresAt = expiresAt;
        await this.db.pendingRegistrations.save(pending);

        this.logger.LogInfo('Pending registration updated in DB', {
          context: 'OtpService.savePendingToDb',
          phone: phone.substring(0, 3) + '***',
          pendingId: pending.id,
          action: 'PENDING_UPDATED_DB',
        });

        return pending.id;
      }
    }

    // Create new pending registration if none exists or was expired
    if (!pending) {
      pending = this.db.pendingRegistrations.create({
        phone,
        passwordHash,
        fullName,
        attemptCount: 0,
        resendCount: 0,
        expiresAt,
      });
      await this.db.pendingRegistrations.save(pending);

      this.logger.LogInfo('Pending registration created in DB', {
        context: 'OtpService.savePendingToDb',
        phone: phone.substring(0, 3) + '***',
        pendingId: pending.id,
        action: 'PENDING_CREATED_DB',
      });

      return pending.id;
    }

    // This should never happen, but TypeScript needs it
    throw new Error('Unexpected state: pending registration should exist');
  }

  /**
   * Get pending registration data by pendingId (checks Redis first, then DB)
   *
   * @param pendingId Pending registration ID (UUID from Redis or DB id)
   * @param phone Phone number (for Redis lookup)
   * @returns Pending registration data or null if not found
   */
  async getPending(
    pendingId: string,
    phone: string,
  ): Promise<{
    pendingId: string;
    passwordHash: string;
    fullName: string;
    attemptCount: number;
    resendCount: number;
    expiresAt: Date;
  } | null> {
    const redisKey = this.getPendingCacheKey(phone);
    const now = Date.now();

    // Try Redis first
    try {
      const cached = await this.cache.get<string>(redisKey);
      if (cached) {
        const data: PendingRegistrationData = JSON.parse(cached);
        if (data.pendingId === pendingId && data.expiresAt > now) {
          return {
            pendingId: data.pendingId,
            passwordHash: data.passwordHash,
            fullName: data.fullName,
            attemptCount: data.attemptCount,
            resendCount: data.resendCount,
            expiresAt: new Date(data.expiresAt),
          };
        }
      }
    } catch (error) {
      this.logger.LogError(
        'Redis get failed, falling back to database',
        error as Error,
        {
          context: 'OtpService.getPending',
          phone: phone.substring(0, 3) + '***',
          pendingId,
          action: 'REDIS_FALLBACK_DB',
        },
      );
    }

    // Fallback to DB
    const pending = await this.db.pendingRegistrations.findOne({
      where: { id: pendingId, phone },
    });

    if (!pending) {
      return null;
    }

    // Check if expired
    if (pending.expiresAt < new Date()) {
      await this.db.pendingRegistrations.remove(pending);
      return null;
    }

    return {
      pendingId: pending.id,
      passwordHash: pending.passwordHash,
      fullName: pending.fullName,
      attemptCount: pending.attemptCount,
      resendCount: pending.resendCount,
      expiresAt: pending.expiresAt,
    };
  }

  /**
   * Delete pending registration from both Redis and DB
   *
   * @param phone Phone number
   * @param pendingId Pending registration ID (optional, for DB lookup)
   */
  async deletePending(phone: string, pendingId?: string): Promise<void> {
    const redisKey = this.getPendingCacheKey(phone);

    // Delete from Redis
    try {
      await this.cache.remove(redisKey);
    } catch (error) {
      this.logger.LogError(
        'Failed to delete pending registration from Redis',
        error as Error,
        {
          context: 'OtpService.deletePending',
          phone: phone.substring(0, 3) + '***',
          action: 'REDIS_DELETE_FAILED',
        },
      );
    }

    // Delete from DB (if pendingId provided)
    if (pendingId) {
      try {
        const pending = await this.db.pendingRegistrations.findOne({
          where: { id: pendingId, phone },
        });
        if (pending) {
          await this.db.pendingRegistrations.remove(pending);
        }
      } catch (error) {
        this.logger.LogError(
          'Failed to delete pending registration from DB',
          error as Error,
          {
            context: 'OtpService.deletePending',
            phone: phone.substring(0, 3) + '***',
            pendingId,
            action: 'DB_DELETE_FAILED',
          },
        );
      }
    }
  }
}
