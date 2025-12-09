import { Injectable, Inject } from '@nestjs/common';
import type { IApplicationConfig } from '@shared/interfaces/config/IApplicationConfig.interface';
import { IApplicationConfig as IApplicationConfigToken } from '@shared/tokens/injection.tokens';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { UserType } from '@shared/enums/UserType.enum';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import { PhoneNumberUtil } from '@shared/utils/PhoneNumberUtil';

/**
 * Auth Validation Service
 *
 * Handles business rule validation for authentication operations.
 * Uses ApplicationConfig for lockout thresholds and durations.
 */
@Injectable()
export class AuthValidationService {
  constructor(
    @Inject(IApplicationConfigToken)
    private readonly appConfig: IApplicationConfig,
  ) {}

  /**
   * Validate login request
   * Ensures either email or phone is provided, but not both
   */
  validateLoginRequest(dto: LoginRequestDto): void {
    if (!dto.email && !dto.phone) {
      throw new ValidationException('Either email or phone is required');
    }

    if (dto.email && dto.phone) {
      throw new ValidationException('Provide either email or phone, not both');
    }

    // Validate phone format if provided
    if (dto.phone) {
      PhoneNumberUtil.validate(dto.phone);
    }
  }

  /**
   * Check if user can login
   * Validates account status, verification, and lockout status
   */
  canUserLogin(user: SysUsers): {
    allowed: boolean;
    reason?: string;
    lockedUntil?: Date;
  } {
    // Check if account is locked
    if (user.accountStatus === AccountStatus.Locked) {
      // Check if lockout period has expired
      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil(
          (user.lockedUntil.getTime() - Date.now()) / 60000,
        );
        return {
          allowed: false,
          reason: `Account locked due to multiple failed login attempts. Try again in ${minutesRemaining} minute(s).`,
          lockedUntil: user.lockedUntil,
        };
      }
      // Lockout expired - will be unlocked in service
    }

    if (user.accountStatus === AccountStatus.NotValid) {
      return { allowed: false, reason: 'Account not verified' };
    }

    if (user.accountStatus === AccountStatus.Suspended) {
      return { allowed: false, reason: 'Account suspended' };
    }

    if (user.accountStatus === AccountStatus.Inactive) {
      return { allowed: false, reason: 'Account inactive' };
    }

    if (user.accountStatus !== AccountStatus.Active) {
      return { allowed: false, reason: 'Account not active' };
    }

    // Check phone verification for leads
    if (user.userType === UserType.Lead && !user.isPhoneVerified) {
      return { allowed: false, reason: 'Phone number not verified' };
    }

    return { allowed: true };
  }

  /**
   * Handle failed login attempt
   * Increments failed attempts and locks account if threshold exceeded
   */
  handleFailedLoginAttempt(user: SysUsers): void {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    // Lock account if threshold exceeded
    if (
      user.failedLoginAttempts >= this.appConfig.auth.accountLockoutThreshold
    ) {
      user.accountStatus = AccountStatus.Locked;
      user.lockedUntil = new Date(
        Date.now() +
          this.appConfig.auth.accountLockoutDurationMinutes * 60 * 1000,
      );
    }
  }

  /**
   * Reset failed attempts on successful login
   * Also unlocks account if lockout period has expired
   */
  resetFailedAttempts(user: SysUsers): void {
    user.failedLoginAttempts = 0;
    const lockedUntil = user.lockedUntil;
    user.lockedUntil = undefined;

    // Auto-unlock if lockout period expired
    if (
      user.accountStatus === AccountStatus.Locked &&
      (!lockedUntil || lockedUntil <= new Date())
    ) {
      user.accountStatus = AccountStatus.Active;
    }
  }

  /**
   * Check if account lockout has expired
   */
  isLockoutExpired(user: SysUsers): boolean {
    if (user.accountStatus !== AccountStatus.Locked) {
      return false;
    }
    return !user.lockedUntil || user.lockedUntil <= new Date();
  }
}
