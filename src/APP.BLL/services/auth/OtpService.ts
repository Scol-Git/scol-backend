import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ICacheService } from '@shared/interfaces/infrastructure';
import { ICacheService as ICacheServiceToken } from '@shared/tokens/injection.tokens';
import { IPasswordHasher } from '@shared/interfaces/security';
import { IPasswordHasher as IPasswordHasherToken } from '@shared/tokens/injection.tokens';
import { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISecurityConfig as ISecurityConfigToken } from '@shared/tokens/injection.tokens';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { InvalidOtpException } from '@shared/exceptions/auth/InvalidOtpException';
import { OtpExpiredException } from '@shared/exceptions/auth/OtpExpiredException';
import { OtpAttemptsExceededException } from '@shared/exceptions/auth/OtpAttemptsExceededException';
import { OtpResendRateLimitException } from '@shared/exceptions/auth/OtpResendRateLimitException';
import { BusinessException } from '@shared/exceptions/BusinessException';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { PendingRegistration } from '@entity/entities/PendingRegistration.entity';

type PendingRegistrationCache = Pick<
  PendingRegistration,
  | 'id'
  | 'phone'
  | 'passwordHash'
  | 'fullName'
  | 'attemptCount'
  | 'resendCount'
  | 'expiresAt'
  | 'lastOtpSentAt'
  | 'otpHash'
  | 'otpAttempts'
  | 'otpCreatedAt'
>;

/**
 * OTP Service
 *
 * Manages OTP generation, verification, and per-session rate limiting.
 * Simple approach: Always save to BOTH Redis and DB to keep them in sync.
 */
@Injectable()
export class OtpService {
  private readonly otpLength: number;
  private readonly otpTtl: number;
  private readonly maxAttempts: number;
  private readonly resendCooldown: number;
  private readonly maxResendPerSession: number;
  private readonly redisPrefix: string;
  private readonly maxTotalOtps: number;

  constructor(
    @Inject(ICacheServiceToken) private readonly cache: ICacheService,
    @Inject(IPasswordHasherToken) private readonly hasher: IPasswordHasher,
    @Inject(ISecurityConfigToken) private readonly config: ISecurityConfig,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    private readonly db: AppDbContext,
  ) {
    this.otpLength = config.otp.length;
    this.otpTtl = config.otp.ttlSeconds;
    this.maxAttempts = config.otp.maxAttempts;
    this.resendCooldown = config.otp.resendCooldownSeconds;
    this.maxResendPerSession = config.otp.maxResendPerSession;
    this.redisPrefix = config.otp.redisPrefix;
    this.maxTotalOtps = this.maxResendPerSession + 1;
  }

  /**
   * Generate random numeric OTP
   */
  public generateOtp(): string {
    const min = Math.pow(10, this.otpLength - 1);
    const max = Math.pow(10, this.otpLength) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Save pending registration WITH OTP
   * Saves to BOTH Redis and DB to keep them in sync
   */
  async savePendingWithOtp(
    phone: string,
    passwordHash: string,
    fullName: string,
    plainOtp: string,
    expiresAt: Date,
  ): Promise<string> {
    const otpHash = await this.hasher.hash(plainOtp);
    const existingPending = await this.getPendingByPhone(phone);

    // If existing and not expired, update it
    if (existingPending && this.isNotExpired(existingPending.expiresAt)) {
      const updated: PendingRegistrationCache = {
        ...existingPending,
        passwordHash,
        fullName,
        expiresAt,
        otpHash,
        otpAttempts: 0,
        otpCreatedAt: new Date(),
      };

      await this.savePendingToCacheAndDb(phone, updated);
      this.logPendingOperation('updated', phone, existingPending.id);
      return existingPending.id;
    }

    // Create new registration
    const newPendingId = randomUUID();
    const newData: PendingRegistrationCache = {
      id: newPendingId,
      phone,
      passwordHash,
      fullName,
      attemptCount: 0,
      resendCount: 0,
      expiresAt,
      lastOtpSentAt: undefined,
      otpHash,
      otpAttempts: 0,
      otpCreatedAt: new Date(),
    };

    await this.savePendingToCacheAndDb(phone, newData);
    this.logPendingOperation('created', phone, newPendingId);
    return newPendingId;
  }

  /**
   * Verify OTP
   * Reads from Redis first, falls back to DB
   */
  async verifyOtp(phone: string, otp: string): Promise<{ pendingId: string }> {
    const pendingData = await this.getPendingByPhone(phone);

    if (!pendingData?.otpHash) {
      throw new OtpExpiredException();
    }

    // Check if OTP expired
    if (pendingData.otpCreatedAt) {
      const otpAge = Date.now() - this.toTimestamp(pendingData.otpCreatedAt);
      if (otpAge > this.otpTtl * 1000) {
        throw new OtpExpiredException();
      }
    }

    // Check attempts
    if (pendingData.otpAttempts >= this.maxAttempts) {
      await this.deletePending(phone, pendingData.id);
      throw new OtpAttemptsExceededException(this.maxAttempts);
    }

    // Verify OTP
    const isValid = await this.hasher.verify(otp, pendingData.otpHash);

    if (!isValid) {
      await this.incrementOtpAttempts(phone, pendingData.id);
      throw new InvalidOtpException();
    }

    return { pendingId: pendingData.id };
  }

  /**
   * Check if we can send (or resend) OTP for this registration session
   * Updates resendCount and lastOtpSentAt in both Redis and DB
   */
  async ensureCanSendOtpForSession(
    phone: string,
    pendingId: string,
  ): Promise<void> {
    const pending = await this.getPendingByIdAndPhone(phone, pendingId);

    if (!pending) {
      throw new BusinessException(
        'Registration session expired. Please register again.',
        'REGISTRATION_EXPIRED',
      );
    }

    // Check if expired
    if (!this.isNotExpired(pending.expiresAt)) {
      await this.deletePending(phone, pendingId);
      throw new BusinessException(
        'Registration session expired. Please register again.',
        'REGISTRATION_EXPIRED',
      );
    }

    // Check max OTPs per session
    const currentCount = pending.resendCount ?? 0;
    if (currentCount >= this.maxTotalOtps) {
      throw new OtpResendRateLimitException(
        'You have reached the maximum number of OTPs for this registration.',
        0,
      );
    }

    // Check cooldown
    if (pending.lastOtpSentAt) {
      const elapsedSeconds = this.getElapsedSeconds(
        pending.lastOtpSentAt,
        Date.now(),
      );
      if (elapsedSeconds < this.resendCooldown) {
        const retryAfter = this.resendCooldown - elapsedSeconds;
        throw new OtpResendRateLimitException(
          `Please wait ${retryAfter} seconds before requesting a new OTP.`,
          retryAfter,
        );
      }
    }

    // Update counters
    await this.updateResendCounters(phone, pending, currentCount + 1);
  }

  /**
   * Update OTP in existing pending registration (for resends)
   * Updates both Redis and DB
   */
  async updateOtpInPending(
    phone: string,
    pendingId: string,
    plainOtp: string,
  ): Promise<void> {
    const otpHash = await this.hasher.hash(plainOtp);
    const redisKey = this.getPendingCacheKey(phone);

    // Try to update Redis
    const cached =
      await this.safeGetFromCache<PendingRegistrationCache>(redisKey);
    if (cached && cached.id === pendingId) {
      cached.otpHash = otpHash;
      cached.otpAttempts = 0;
      cached.otpCreatedAt = new Date();
      await this.safeSetToCache(redisKey, cached, this.otpTtl);
    }

    // Always update DB
    await this.db.pendingRegistrations.update(
      { id: pendingId, phone },
      {
        otpHash,
        otpAttempts: 0,
        otpCreatedAt: new Date(),
      },
    );

    this.logger.LogInfo('OTP updated in pending registration', {
      context: 'OtpService.updateOtpInPending',
      phone: this.maskPhone(phone),
      pendingId,
    });
  }

  /**
   * Get pending registration data
   * Tries Redis first, falls back to DB
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
    const pending = await this.getPendingByIdAndPhone(phone, pendingId);

    if (!pending) {
      return null;
    }

    if (!this.isNotExpired(pending.expiresAt)) {
      await this.deletePending(phone, pendingId);
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
   */
  async deletePending(phone: string, pendingId?: string): Promise<void> {
    const redisKey = this.getPendingCacheKey(phone);

    // Delete from Redis
    await this.safeRemoveFromCache(redisKey);

    // Delete from DB
    if (pendingId) {
      try {
        const pending = await this.db.pendingRegistrations.findOne({
          where: { id: pendingId, phone },
        });
        if (pending) {
          await this.db.pendingRegistrations.remove(pending);
        }
      } catch (error) {
        this.logger.LogError('DB delete failed', error as Error, {
          context: 'OtpService.deletePending',
          phone: this.maskPhone(phone),
          pendingId,
        });
      }
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Get pending registration by phone (Redis-first with DB fallback)
   */
  private async getPendingByPhone(
    phone: string,
  ): Promise<PendingRegistrationCache | null> {
    const redisKey = this.getPendingCacheKey(phone);

    // Try Redis first
    const cached =
      await this.safeGetFromCache<PendingRegistrationCache>(redisKey);
    if (cached) {
      return cached;
    }

    // Fallback to DB
    const dbPending = await this.db.pendingRegistrations.findOne({
      where: { phone },
    });

    return dbPending ?? null;
  }

  /**
   * Get pending registration by ID and phone (Redis-first with DB fallback)
   */
  private async getPendingByIdAndPhone(
    phone: string,
    pendingId: string,
  ): Promise<PendingRegistrationCache | null> {
    const redisKey = this.getPendingCacheKey(phone);

    // Try Redis first
    const cached =
      await this.safeGetFromCache<PendingRegistrationCache>(redisKey);
    if (cached && cached.id === pendingId) {
      return cached;
    }

    // Fallback to DB
    const dbPending = await this.db.pendingRegistrations.findOne({
      where: { id: pendingId, phone },
    });

    return dbPending ?? null;
  }

  /**
   * Save pending registration to both Redis and DB
   */
  private async savePendingToCacheAndDb(
    phone: string,
    data: PendingRegistrationCache,
  ): Promise<void> {
    const redisKey = this.getPendingCacheKey(phone);

    // Save to Redis
    await this.safeSetToCache(redisKey, data, this.otpTtl);

    // Save to DB
    if (data.id) {
      const existing = await this.db.pendingRegistrations.findOne({
        where: { id: data.id },
      });

      if (existing) {
        await this.db.pendingRegistrations.update({ id: data.id }, data);
      } else {
        const pending = this.db.pendingRegistrations.create(data);
        await this.db.pendingRegistrations.save(pending);
      }
    }
  }

  /**
   * Update resend counters in both Redis and DB
   */
  private async updateResendCounters(
    phone: string,
    pending: PendingRegistrationCache,
    newResendCount: number,
  ): Promise<void> {
    const redisKey = this.getPendingCacheKey(phone);
    const newLastOtpSentAt = new Date();

    pending.resendCount = newResendCount;
    pending.lastOtpSentAt = newLastOtpSentAt;

    await this.safeSetToCache(redisKey, pending, this.otpTtl);

    await this.db.pendingRegistrations.update(
      { id: pending.id },
      {
        resendCount: newResendCount,
        lastOtpSentAt: newLastOtpSentAt,
      },
    );
  }

  /**
   * Increment OTP attempt counter in both Redis and DB
   */
  private async incrementOtpAttempts(
    phone: string,
    pendingId: string,
  ): Promise<void> {
    const redisKey = this.getPendingCacheKey(phone);

    // Try to increment in Redis
    const cached =
      await this.safeGetFromCache<PendingRegistrationCache>(redisKey);
    if (cached) {
      cached.otpAttempts = (cached.otpAttempts ?? 0) + 1;
      await this.safeSetToCache(redisKey, cached, this.otpTtl);
    }

    // Always increment in DB
    await this.db.pendingRegistrations.increment(
      { id: pendingId, phone },
      'otpAttempts',
      1,
    );
  }

  /**
   * Safe get from cache with error handling
   */
  private async safeGetFromCache<T>(key: string): Promise<T | null> {
    try {
      const cached = await this.cache.get<string>(key);
      if (!cached) {
        return null;
      }
      return JSON.parse(cached) as T;
    } catch (error) {
      this.logger.LogError('Redis get failed', error as Error, {
        context: 'OtpService',
        key: key.substring(0, 20) + '...',
      });
      return null;
    }
  }

  /**
   * Safe set to cache with error handling
   */
  private async safeSetToCache<T>(
    key: string,
    value: T,
    ttlSeconds: number,
  ): Promise<void> {
    try {
      await this.cache.set(key, JSON.stringify(value), ttlSeconds);
    } catch (error) {
      this.logger.LogError('Redis set failed', error as Error, {
        context: 'OtpService',
        key: key.substring(0, 20) + '...',
      });
    }
  }

  /**
   * Safe remove from cache with error handling
   */
  private async safeRemoveFromCache(key: string): Promise<void> {
    try {
      await this.cache.remove(key);
    } catch (error) {
      this.logger.LogError('Redis delete failed', error as Error, {
        context: 'OtpService',
        key: key.substring(0, 20) + '...',
      });
    }
  }

  /**
   * Convert date to timestamp (handles both Date objects and strings)
   */
  private toTimestamp(date: Date | string | undefined): number {
    if (!date) {
      return 0;
    }
    if (date instanceof Date) {
      return date.getTime();
    }
    return new Date(date).getTime();
  }

  /**
   * Check if date is not expired
   */
  private isNotExpired(expiresAt: Date | string): boolean {
    return this.toTimestamp(expiresAt) > Date.now();
  }

  /**
   * Get elapsed seconds between two timestamps
   */
  private getElapsedSeconds(from: Date | string, to: number): number {
    return Math.floor((to - this.toTimestamp(from)) / 1000);
  }

  /**
   * Mask phone number for logging
   */
  private maskPhone(phone: string): string {
    return phone.substring(0, 3) + '***';
  }

  /**
   * Log pending operation
   */
  private logPendingOperation(
    operation: 'created' | 'updated',
    phone: string,
    pendingId: string,
  ): void {
    this.logger.LogInfo(`Pending registration with OTP ${operation}`, {
      context: 'OtpService.savePendingWithOtp',
      phone: this.maskPhone(phone),
      pendingId,
    });
  }

  /**
   * Get pending registration cache key
   */
  private getPendingCacheKey(phone: string): string {
    return `${this.redisPrefix}pending:${phone}`;
  }
}
