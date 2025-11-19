import { Column, Entity, Index, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './BaseEntity.template';
import { Role } from './Role.entity';
import { Permission } from './Permission.entity';

/**
 * RolePermission Junction Entity
 *
 * Represents the many-to-many relationship between Roles and Permissions.
 * Provides explicit control over role-permission assignments.
 *
 * @entity RolePermission
 */
@Entity('role_permissions')
@Unique('UQ_role_permission', ['roleId', 'permissionId'])
@Index('IX_role_permission_role', ['roleId'])
@Index('IX_role_permission_permission', ['permissionId'])
export class RolePermission extends BaseEntity {
  @Column({ type: 'uuid' })
  roleId!: string;

  @Column({ type: 'uuid' })
  permissionId!: string;

  @ManyToOne(() => Role, (role) => role.rolePermissions, { onDelete: 'CASCADE' })
  role!: Role;

  @ManyToOne(() => Permission, (permission) => permission.rolePermissions, {
    onDelete: 'CASCADE',
  })
  permission!: Permission;
}

