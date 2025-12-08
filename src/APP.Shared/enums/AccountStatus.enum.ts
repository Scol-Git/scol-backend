/**
 * Account Status Enum
 *
 * Represents the current status of a user account in the system.
 *
 * @enum {string}
 */
export enum AccountStatus {
  /**
   * User registered but hasn't verified phone/email (OTP not verified yet)
   */
  NotValid = 'NotValid',

  /**
   * User account is active and can access the system
   */
  Active = 'Active',

  /**
   * User account has been deactivated by user or admin
   */
  Inactive = 'Inactive',

  /**
   * User account temporarily suspended due to policy violation
   */
  Suspended = 'Suspended',

  /**
   * User account locked due to too many failed login attempts
   */
  Locked = 'Locked',
}

