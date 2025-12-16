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
import { OtpSession, OtpPurpose } from '@entity/entities/OtpSession.entity';

type OtpSessionCache = Pick<
  OtpSession,
  | 'id'
  | 'phone'
  | 'purpose'
  | 'sessionId'
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

export interface OtpSessionData {
  sessionId: string;
  passwordHash?: string;
  fullName?: string;
  attemptCount?: number;
  resendCount: number;
  expiresAt: Date;
}

/**
 * OTP Service
 *
 * Unified service for managing OTP sessions (registration and password reset).
 * Always saves to BOTH Redis and DB to keep them in sync.
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
   * Save OTP session (unified for registration and password reset)
   * Saves to BOTH Redis and DB to keep them in sync
   */
  async saveOtpSession(
    purpose: OtpPurpose,
    phone: string,
    plainOtp: string,
    expiresAt: Date,
    metadata?: {
      passwordHash?: string;
      fullName?: string;
    },
  ): Promise<{ sessionId: string }> {
    try {
      // Generate OTP hash for storage
      const otpHash = await this.hasher.hash(plainOtp);

      // Check if session already exists
      const existingSession = await this.getOtpSessionByPhoneAndPurpose(
        phone,
        purpose,
      );

      // If session exists and is not expired, update it
      if (existingSession && this.isNotExpired(existingSession.expiresAt)) {
        const updated: OtpSessionCache = {
          ...existingSession,
          expiresAt,
          otpHash,
          otpAttempts: 0,
          otpCreatedAt: new Date(),
          ...(metadata?.passwordHash && {
            passwordHash: metadata.passwordHash,
          }),
          ...(metadata?.fullName && { fullName: metadata.fullName }),
        };

        // Save updated session to cache and database
        await this.saveOtpSessionToCacheAndDb(updated);
        this.logOtpOperation('updated', phone, purpose, existingSession.id);
        return { sessionId: existingSession.id };
      }

      // Create new session if it doesn't exist
      const sessionId = randomUUID();
      const newData: OtpSessionCache = {
        id: sessionId,
        phone,
        purpose,
        sessionId,
        passwordHash: metadata?.passwordHash,
        fullName: metadata?.fullName,
        attemptCount: purpose === OtpPurpose.Registration ? 0 : undefined,
        resendCount: 0,
        expiresAt,
        lastOtpSentAt: undefined,
        otpHash,
        otpAttempts: 0,
        otpCreatedAt: new Date(),
      };

      await this.saveOtpSessionToCacheAndDb(newData);
      this.logOtpOperation('created', phone, purpose, sessionId);
      return { sessionId };
    } catch (error) {
      this.logger.LogError('Failed to save OTP session', error as Error, {
        context: 'OtpService.saveOtpSession',
        phone: this.maskPhone(phone),
        purpose,
      });

      throw new BusinessException(
        'Failed to save OTP session',
        'OTP_SESSION_SAVE_FAILED',
      );
    }
  }

  /**
   * Verify OTP
   * Reads from Redis first, falls back to DB
   */
  async verifyOtp(
    purpose: OtpPurpose,
    phone: string,
    sessionId: string,
    otp: string,
  ): Promise<{ sessionId: string }> {
    const sessionData = await this.getOtpSessionByPhonePurposeAndSessionId(
      phone,
      purpose,
      sessionId,
    );

    if (!sessionData?.otpHash) {
      throw new OtpExpiredException();
    }

    // Check if OTP expired
    if (sessionData.otpCreatedAt) {
      const otpAge = Date.now() - this.toTimestamp(sessionData.otpCreatedAt);
      if (otpAge > this.otpTtl * 1000) {
        throw new OtpExpiredException();
      }
    }

    // Check attempts
    if (sessionData.otpAttempts >= this.maxAttempts) {
      await this.deleteOtpSession(phone, purpose, sessionId);
      throw new OtpAttemptsExceededException(this.maxAttempts);
    }

    // Verify OTP
    const isValid = await this.hasher.verify(otp, sessionData.otpHash);

    if (!isValid) {
      await this.incrementOtpAttempts(phone, purpose, sessionId);
      throw new InvalidOtpException();
    }

    return { sessionId: sessionData.sessionId };
  }

  /**
   * Check if we can send (or resend) OTP for this session
   * Updates resendCount and lastOtpSentAt in both Redis and DB
   */
  async ensureCanSendOtp(
    purpose: OtpPurpose,
    phone: string,
    sessionId: string,
  ): Promise<void> {
    const session = await this.getOtpSessionByPhonePurposeAndSessionId(
      phone,
      purpose,
      sessionId,
    );

    if (!session) {
      const errorMessage =
        purpose === OtpPurpose.Registration
          ? 'Registration session expired. Please register again.'
          : 'Password reset session expired. Please request a new OTP.';
      throw new BusinessException(errorMessage, 'OTP_SESSION_EXPIRED');
    }

    // Check if expired
    if (!this.isNotExpired(session.expiresAt)) {
      await this.deleteOtpSession(phone, purpose, sessionId);
      const errorMessage =
        purpose === OtpPurpose.Registration
          ? 'Registration session expired. Please register again.'
          : 'Password reset session expired. Please request a new OTP.';
      throw new BusinessException(errorMessage, 'OTP_SESSION_EXPIRED');
    }

    // Check max OTPs per session
    const currentCount = session.resendCount ?? 0;
    if (currentCount >= this.maxTotalOtps) {
      throw new OtpResendRateLimitException(
        'You have reached the maximum number of OTPs for this session.',
        0,
      );
    }

    // Check cooldown
    if (session.lastOtpSentAt) {
      const elapsedSeconds = this.getElapsedSeconds(
        session.lastOtpSentAt,
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
    await this.updateResendCounters(phone, purpose, session, currentCount + 1);
  }

  /**
   * Update OTP in existing session (for resends)
   * Updates both Redis and DB
   */
  async updateOtpInSession(
    purpose: OtpPurpose,
    phone: string,
    sessionId: string,
    plainOtp: string,
  ): Promise<void> {
    const otpHash = await this.hasher.hash(plainOtp);
    const redisKey = this.getOtpSessionCacheKey(phone, purpose);

    // Try to update Redis
    const cached = await this.safeGetFromCache<OtpSessionCache>(redisKey);
    if (cached && cached.sessionId === sessionId) {
      cached.otpHash = otpHash;
      cached.otpAttempts = 0;
      cached.otpCreatedAt = new Date();
      await this.safeSetToCache(redisKey, cached, this.otpTtl);
    }

    // Always update DB
    await this.db.otpSessions.update(
      { phone, purpose, sessionId },
      {
        otpHash,
        otpAttempts: 0,
        otpCreatedAt: new Date(),
      },
    );

    this.logger.LogInfo('OTP updated in session', {
      context: 'OtpService.updateOtpInSession',
      phone: this.maskPhone(phone),
      purpose,
      sessionId,
    });
  }

  /**
   * Get OTP session data
   * Tries Redis first, falls back to DB
   */
  async getOtpSession(
    purpose: OtpPurpose,
    phone: string,
    sessionId: string,
  ): Promise<OtpSessionData | null> {
    const session = await this.getOtpSessionByPhonePurposeAndSessionId(
      phone,
      purpose,
      sessionId,
    );

    if (!session) {
      return null;
    }

    if (!this.isNotExpired(session.expiresAt)) {
      await this.deleteOtpSession(phone, purpose, sessionId);
      return null;
    }

    return {
      sessionId: session.sessionId,
      passwordHash: session.passwordHash,
      fullName: session.fullName,
      attemptCount: session.attemptCount,
      resendCount: session.resendCount,
      expiresAt: session.expiresAt,
    };
  }

  /**
   * Delete OTP session from both Redis and DB
   */
  async deleteOtpSession(
    phone: string,
    purpose: OtpPurpose,
    sessionId: string,
  ): Promise<void> {
    const redisKey = this.getOtpSessionCacheKey(phone, purpose);

    // Delete from Redis
    await this.safeRemoveFromCache(redisKey);

    // Delete from DB
    try {
      const session = await this.db.otpSessions.findOne({
        where: { phone, purpose, sessionId },
      });
      if (session) {
        await this.db.otpSessions.remove(session);
      }
    } catch (error) {
      this.logger.LogError('DB delete failed', error as Error, {
        context: 'OtpService.deleteOtpSession',
        phone: this.maskPhone(phone),
        purpose,
        sessionId,
      });
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Get OTP session by phone and purpose (Redis-first with DB fallback)
   */
  private async getOtpSessionByPhoneAndPurpose(
    phone: string,
    purpose: OtpPurpose,
  ): Promise<OtpSessionCache | null> {
    const redisKey = this.getOtpSessionCacheKey(phone, purpose);

    // Try Redis first
    const cached = await this.safeGetFromCache<OtpSessionCache>(redisKey);
    if (cached) {
      return cached;
    }

    // Fallback to DB
    const dbSession = await this.db.otpSessions.findOne({
      where: { phone, purpose },
    });

    return dbSession ?? null;
  }

  /**
   * Get OTP session by phone, purpose, and sessionId (Redis-first with DB fallback)
   */
  private async getOtpSessionByPhonePurposeAndSessionId(
    phone: string,
    purpose: OtpPurpose,
    sessionId: string,
  ): Promise<OtpSessionCache | null> {
    const redisKey = this.getOtpSessionCacheKey(phone, purpose);

    // Try Redis first
    const cached = await this.safeGetFromCache<OtpSessionCache>(redisKey);
    if (cached && cached.sessionId === sessionId) {
      return cached;
    }

    // Fallback to DB
    const dbSession = await this.db.otpSessions.findOne({
      where: { phone, purpose, sessionId },
    });

    return dbSession ?? null;
  }

  /**
   * Save OTP session to both Redis and DB
   */
  private async saveOtpSessionToCacheAndDb(
    data: OtpSessionCache,
  ): Promise<void> {
    const redisKey = this.getOtpSessionCacheKey(data.phone, data.purpose);

    // Save to Redis
    await this.safeSetToCache(redisKey, data, this.otpTtl);

    // Save to DB
    if (data.id) {
      const existing = await this.db.otpSessions.findOne({
        where: { id: data.id },
      });

      if (existing) {
        await this.db.otpSessions.update({ id: data.id }, data);
      } else {
        const session = this.db.otpSessions.create(data);
        await this.db.otpSessions.save(session);
      }
    }
  }

  /**
   * Update resend counters in both Redis and DB
   */
  private async updateResendCounters(
    phone: string,
    purpose: OtpPurpose,
    session: OtpSessionCache,
    newResendCount: number,
  ): Promise<void> {
    const redisKey = this.getOtpSessionCacheKey(phone, purpose);
    const newLastOtpSentAt = new Date();

    session.resendCount = newResendCount;
    session.lastOtpSentAt = newLastOtpSentAt;

    await this.safeSetToCache(redisKey, session, this.otpTtl);

    await this.db.otpSessions.update(
      { id: session.id },
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
    purpose: OtpPurpose,
    sessionId: string,
  ): Promise<void> {
    const redisKey = this.getOtpSessionCacheKey(phone, purpose);

    // Try to increment in Redis
    const cached = await this.safeGetFromCache<OtpSessionCache>(redisKey);
    if (cached && cached.sessionId === sessionId) {
      cached.otpAttempts = (cached.otpAttempts ?? 0) + 1;
      await this.safeSetToCache(redisKey, cached, this.otpTtl);
    }

    // Always increment in DB
    await this.db.otpSessions.increment(
      { phone, purpose, sessionId },
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
   * Log OTP operation
   */
  private logOtpOperation(
    operation: 'created' | 'updated',
    phone: string,
    purpose: OtpPurpose,
    sessionId: string,
  ): void {
    this.logger.LogInfo(`OTP session ${operation}`, {
      context: 'OtpService.saveOtpSession',
      phone: this.maskPhone(phone),
      purpose,
      sessionId,
    });
  }

  /**
   * Get OTP session cache key
   */
  private getOtpSessionCacheKey(phone: string, purpose: OtpPurpose): string {
    return `${this.redisPrefix}otp:${purpose}:${phone}`;
  }
}
