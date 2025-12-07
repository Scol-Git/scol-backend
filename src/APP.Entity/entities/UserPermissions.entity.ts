import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUsers } from './SysUsers.entity';
import { SysPermissions } from './SysPermissions.entity';

/**
 * @class UserPermissions
 * @extends {BaseEntity}
 */
@Entity('UserPermissions')
export class UserPermissions extends BaseEntity {
  @Column({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  userId!: string;

  @Column({
    name: 'permission_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  permissionId!: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: User
   * Direct access to the user in this junction
   */
  @ManyToOne(() => SysUsers, (user) => user.permissions)
  @JoinColumn({ name: 'user_id' })
  user!: SysUsers;

  /**
   * Many-to-One: Permission
   * Direct access to the permission in this junction
   */
  @ManyToOne(() => SysPermissions, (permission) => permission.users)
  @JoinColumn({ name: 'permission_id' })
  permission!: SysPermissions;
}
