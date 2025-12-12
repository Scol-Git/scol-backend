import { Entity, Column, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * OTP Purpose Enum
 * Defines the purpose/context of the OTP session
 */
export enum OtpPurpose {
  Registration = 'registration',
  PasswordReset = 'password_reset',
}

/**
 * @class OtpSession
 * @extends {BaseEntity}
 *
 * Unified storage for OTP sessions (registration and password reset).
 * Records are deleted after successful verification or expire after TTL.
 * Redis and DB are kept in sync for all operations.
 */
@Index('IX_OtpSession_phone_purpose', ['phone', 'purpose'], { unique: true })
@Entity('otp_sessions')
export class OtpSession extends BaseEntity {
  /**
   * Phone number associated with OTP session
   */
  @Column({
    name: 'phone',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @AutoMap()
  phone!: string;

  /**
   * Purpose of the OTP session (registration or password_reset)
   */
  @Column({
    name: 'purpose',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @AutoMap()
  purpose!: OtpPurpose;

  /**
   * Session identifier (pendingId for registration, userId for password_reset)
   */
  @Column({
    name: 'sessionId',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  sessionId!: string;

  /**
   * Password hash (only for registration purpose)
   */
  @Column({
    name: 'passwordHash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  passwordHash?: string;

  /**
   * Full name (only for registration purpose)
   */
  @Column({
    name: 'fullName',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  fullName?: string;

  /**
   * Registration attempt count (only for registration purpose)
   */
  @Column({
    name: 'attemptCount',
    type: 'int',
    nullable: true,
    default: 0,
  })
  @AutoMap()
  attemptCount?: number;

  /**
   * OTP resend count (rate limiting)
   */
  @Column({
    name: 'resendCount',
    type: 'int',
    nullable: false,
    default: 0,
  })
  @AutoMap()
  resendCount!: number;

  /**
   * Session expiration time
   */
  @Column({
    name: 'expiresAt',
    type: 'timestamptz',
    nullable: false,
  })
  @AutoMap()
  expiresAt!: Date;

  /**
   * Last time OTP was sent (for cooldown checking)
   */
  @Column({
    name: 'lastOtpSentAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  lastOtpSentAt?: Date;

  /**
   * Hashed OTP value
   */
  @Column({
    name: 'otpHash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  otpHash?: string;

  /**
   * Number of failed OTP verification attempts
   */
  @Column({
    name: 'otpAttempts',
    type: 'int',
    nullable: false,
    default: 0,
  })
  @AutoMap()
  otpAttempts!: number;

  /**
   * When the current OTP was created
   */
  @Column({
    name: 'otpCreatedAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  otpCreatedAt?: Date;
}

