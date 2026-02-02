import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUsers } from './SysUsers.entity';

/**
 * @class UserSessions
 * @extends {BaseEntity}
 */
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
    length: 255,
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

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: User
   * Each session belongs to one user
   */
  @ManyToOne(() => SysUsers, (user) => user.UserSession)
  @JoinColumn({ name: 'user_id' })
  SysUser!: SysUsers;
}
