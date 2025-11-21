import { UnauthorizedException } from '@nestjs/common';

/**
 * Account Locked Exception
 *
 * Thrown when user account is locked due to too many failed login attempts.
 * Extends NestJS UnauthorizedException for proper HTTP status code (401).
 *
 * @example
 * throw new AccountLockedException();
 *
 * @example
 * throw new AccountLockedException(lockedUntilDate);
 */
export class AccountLockedException extends UnauthorizedException {
  /**
   * Creates a new AccountLockedException instance.
   *
   * @param lockedUntil - Optional date when account will be unlocked
   */
  constructor(lockedUntil?: Date) {
    const message = lockedUntil
      ? `Account is locked until ${lockedUntil.toISOString()}`
      : 'Account is locked due to too many failed login attempts';
    super(message);
  }
}
