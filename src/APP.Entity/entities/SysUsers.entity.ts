import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysRoles } from './SysRoles.entity';
import { SysPermissions } from './SysPermissions.entity';
import { UserSessions } from './UserSessions.entity';
import { SysLeadProfiles } from './SysLeadProfiles.entity';

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

  @Column({
    name: 'totalOtpAttempt',
    type: 'int',
    nullable: false,
    default: 0,
  })
  @AutoMap()
  totalOtpAttempt!: number;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-Many: User roles
   * A user can have multiple roles, and a role can belong to multiple users
   */
  @ManyToMany(() => SysRoles, (role) => role.users)
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
  @ManyToMany(() => SysPermissions, (permission) => permission.users)
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
  @OneToMany(() => UserSessions, (session) => session.user)
  sessions!: UserSessions[];

  /**
   * One-to-One: Lead profile
   * A user may have an associated lead profile
   */
  @OneToOne(() => SysLeadProfiles, (profile) => profile.user)
  leadProfile?: SysLeadProfiles;
}
