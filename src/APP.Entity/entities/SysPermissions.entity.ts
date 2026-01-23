import { Entity, Column, ManyToMany, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUsers } from './SysUsers.entity';
import { SysRoles } from './SysRoles.entity';

/**
 * @class SysPermissions
 * @extends {BaseEntity}
 */
@Index('IX_SysPermissions_name', ['name'], { unique: true })
@Entity('sys_Permissions')
export class SysPermissions extends BaseEntity {
  @Column({
    name: 'name',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  name!: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-Many: Users with this permission
   * Inverse side of the relationship defined in SysUsers
   */
  @ManyToMany(() => SysUsers, (user) => user.permissions)
  SysUser!: SysUsers[];

  /**
   * Many-to-Many: Roles with this permission
   * Inverse side (if you have RolePermissions table)
   * Note: Uncomment if you have a RolePermissions relationship
   */
  // @ManyToMany(() => SysRoles, (role) => role.permissions)
  // roles!: SysRoles[];
}
