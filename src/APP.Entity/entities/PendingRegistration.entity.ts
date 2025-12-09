import { Entity, Column, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class PendingRegistration
 * @extends {BaseEntity}
 * 
 * Temporary storage for user registrations pending OTP verification.
 * Records are deleted after successful verification or expire after TTL.
 */
@Index('IX_PendingRegistration_phone', ['phone'], { unique: true })
@Entity('pending_registrations')
export class PendingRegistration extends BaseEntity {
  @Column({
    name: 'phone',
    type: 'varchar',
    length: 50,
    nullable: false,
    unique: true,
  })
  @AutoMap()
  phone!: string;

  @Column({
    name: 'passwordHash',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  passwordHash!: string;

  @Column({
    name: 'fullName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  fullName!: string;

  @Column({
    name: 'attemptCount',
    type: 'int',
    nullable: false,
    default: 0,
  })
  @AutoMap()
  attemptCount!: number;

  @Column({
    name: 'resendCount',
    type: 'int',
    nullable: false,
    default: 0,
  })
  @AutoMap()
  resendCount!: number;

  @Column({
    name: 'expiresAt',
    type: 'timestamptz',
    nullable: false,
  })
  @AutoMap()
  expiresAt!: Date;
}

