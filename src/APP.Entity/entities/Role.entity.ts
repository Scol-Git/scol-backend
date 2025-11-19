import { Column, Entity, Index, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from './BaseEntity.template';
import { UserRole } from './UserRole.entity';
import { RolePermission } from './RolePermission.entity';

/**
 * Role Entity
 * 
 * Represents a role within an organization.
 * Roles are organization-scoped and contain collections of permissions.
 * 
 * @entity Role
 */
@Entity('roles')
@Unique('UQ_role_org_name', ['orgId', 'name'])
@Index('IX_role_org', ['orgId'])
export class Role extends BaseEntity {
  @Column({ type: 'uuid' })
  orgId!: string;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'boolean', default: false })
  isSystemRole!: boolean; // Predefined roles (Admin, Manager, Member, Viewer)

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.role)
  rolePermissions!: RolePermission[];

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles!: UserRole[];
}



