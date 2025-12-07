import { Entity, Column, PrimaryGeneratedColumn, ManyToMany } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUsers } from './SysUsers.entity';
import { SysPermissions } from './SysPermissions.entity';

/**
 * @class SysRoles
 * @extends {BaseEntity}
 */
@Entity('sys_Roles')
export class SysRoles extends BaseEntity {
  @PrimaryGeneratedColumn('uuid', { name: 'role_id' })
  @AutoMap()
  override id!: string;

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
   * Many-to-Many: Users with this role
   * Inverse side of the relationship defined in SysUsers
   */
  @ManyToMany(() => SysUsers, (user) => user.roles)
  users!: SysUsers[];

  /**
   * Many-to-Many: Permissions for this role
   * A role can have multiple permissions
   * Note: If you have a RolePermissions table, uncomment below
   */
  // @ManyToMany(() => SysPermissions, (permission) => permission.roles)
  // @JoinTable({
  //   name: 'RolePermissions',
  //   joinColumn: { name: 'role_id', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  // })
  // permissions!: SysPermissions[];
}
