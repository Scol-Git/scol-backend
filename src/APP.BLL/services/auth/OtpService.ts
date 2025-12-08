import { Injectable, Inject } from '@nestjs/common';
import { ICacheService } from '@shared/interfaces/infrastructure';
import { ICacheService as ICacheServiceToken } from '@shared/tokens/injection.tokens';
import { IPasswordHasher } from '@shared/interfaces/security';
import { IPasswordHasher as IPasswordHasherToken } from '@shared/tokens/injection.tokens';
import { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISecurityConfig as ISecurityConfigToken } from '@shared/tokens/injection.tokens';
import { IRateLimitingStorage } from '@shared/interfaces/infrastructure';
import { IRateLimitingStorage as IRateLimitingStorageToken } from '@shared/tokens/injection.tokens';
import { InvalidOtpException } from '@shared/exceptions/auth/InvalidOtpException';
import { OtpExpiredException } from '@shared/exceptions/auth/OtpExpiredException';
import { OtpAttemptsExceededException } from '@shared/exceptions/auth/OtpAttemptsExceededException';
import { ResendCooldownException } from '@shared/exceptions/auth/ResendCooldownException';
import { BusinessException } from '@shared/exceptions/BusinessException';

interface OtpCacheData {
  userId: string;
  otpHash: string;
  attempts: number;
  createdAt: number;
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
   * @param userId User ID
   * @param phone Phone number
   * @returns Plain OTP string (for sending via SMS)
   */
  async generateAndStoreOtp(userId: string, phone: string): Promise<string> {
    const otp = this.generateOtp();
    const otpHash = await this.hasher.hash(otp);

    const cacheData: OtpCacheData = {
      userId,
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
   * @returns User ID if verification successful
   * @throws InvalidOtpException, OtpExpiredException, OtpAttemptsExceededException
   */
  async verifyOtp(phone: string, otp: string): Promise<{ userId: string }> {
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

    return { userId: data.userId };
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
}
