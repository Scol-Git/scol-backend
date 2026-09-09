import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUsers } from './SysUsers.entity';

/**
 * @class UserSessions
 * @extends {BaseEntity}
 */
@Index('IX_UserSessions_user_id', ['userId'])
@Index('IX_UserSessions_expiresAt', ['expiresAt'])
@Entity('UserSessions')
export class UserSessions extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  userId!: string;

  @Column({
    name: 'refreshTokenHash',
    type: 'varchar',
    length: 64,
    nullable: false,
  })
  @AutoMap()
  refreshTokenHash!: string;

  @Column({
    name: 'expiresAt',
    type: 'timestamptz',
    nullable: false,
  })
  @AutoMap()
  expiresAt!: Date;

  @Column({
    name: 'revokedAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  revokedAt?: Date;

  @Column({
    name: 'revokedReason',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @AutoMap()
  revokedReason?: string;

  @Column({
    name: 'lastUsedAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  lastUsedAt?: Date;

  @Column({
    name: 'ipAddress',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @AutoMap()
  ipAddress?: string;

  @Column({
    name: 'userAgent',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  @AutoMap()
  userAgent?: string;

  @ManyToOne(() => SysUsers, (user) => user.UserSession)
  @JoinColumn({ name: 'user_id' })
  SysUser!: SysUsers;
}
