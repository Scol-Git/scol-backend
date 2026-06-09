import {
  Entity,
  Column,
  ManyToMany,
  JoinTable,
  OneToMany,
  OneToOne,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysRoles } from './SysRoles.entity';
import { SysPermissions } from './SysPermissions.entity';
import { UserSessions } from './UserSessions.entity';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { SysConsultantProfiles } from './SysConsultantProfiles.entity';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { UserType } from '@shared/enums/UserType.enum';

/**
 * @class SysUsers
 * @extends {BaseEntity}
 */
@Index('IX_SysUsers_email', ['email'], { unique: true })
@Index('IX_SysUsers_phone', ['phone'], { unique: true })
@Entity('sys_Users')
export class SysUsers extends BaseEntity {
  @Column({
    name: 'email',
    type: 'varchar',
    length: 255,
    nullable: true,
    unique: true,
  })
  @AutoMap()
  email?: string;

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
    default: AccountStatus.NotValid,
  })
  @AutoMap()
  accountStatus!: AccountStatus;

  @Column({
    name: 'userType',
    type: 'varchar',
    length: 50,
    nullable: false,
    default: UserType.Lead,
  })
  @AutoMap()
  userType!: UserType;

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

  @Column({
    name: 'failedLoginAttempts',
    type: 'int',
    nullable: false,
    default: 0,
  })
  @AutoMap()
  failedLoginAttempts!: number;

  @Column({
    name: 'lockedUntil',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  lockedUntil?: Date;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-Many: User roles
   * A user can have multiple roles, and a role can belong to multiple users
   */
  @ManyToMany(() => SysRoles, (role) => role.SysUser)
  @JoinTable({
    name: 'UserRoles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: SysRoles[];

  /**
   * Many-to-Many: User permissions
   * A user can have multiple direct permissions (in addition to role-based permissions)
   */
  @ManyToMany(() => SysPermissions, (permission) => permission.SysUser)
  @JoinTable({
    name: 'UserPermissions',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: SysPermissions[];

  /**
   * One-to-Many: User sessions
   * A user can have multiple active/historical sessions
   */
  @OneToMany(() => UserSessions, (session) => session.SysUser)
  UserSession!: UserSessions[];

  /**
   * One-to-One: Lead profile
   * A user may have an associated lead profile
   */
  @OneToOne(() => SysLeadProfiles, (profile) => profile.SysUser)
  SysLeadProfile?: SysLeadProfiles;

  /**
   * One-to-One: Consultant public profile
   * A CRM user may have an associated consultant profile
   */
  @OneToOne(
    () => SysConsultantProfiles,
    (profile) => profile.SysUser,
  )
  SysConsultantProfile?: SysConsultantProfiles;

}
