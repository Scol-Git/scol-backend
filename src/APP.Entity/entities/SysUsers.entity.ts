import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysUsers
 * @extends {BaseEntity}
 */
@Entity('sys_Users')
export class SysUsers extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'user_id' })
  @AutoMap()
  override id!: string;

  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: false,
    unique: true,
  })
  @AutoMap()
  email!: string;

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
    name: 'accountStatus',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @AutoMap()
  accountStatus!: string;

  @Column({
    name: 'passResetTokenHash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  passResetTokenHash?: string;

  @Column({
    name: 'passResetTokenExpiredAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  passResetTokenExpiredAt?: Date;

  @Column({
    name: 'isPhoneVerified',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  @AutoMap()
  isPhoneVerified!: boolean;
}

