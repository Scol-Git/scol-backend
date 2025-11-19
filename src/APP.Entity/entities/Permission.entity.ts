import { Column, Entity, Index, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from './BaseEntity.template';
import { RolePermission } from './RolePermission.entity';

/**
 * Permission Entity
 * 
 * Represents a system-wide permission.
 * Permissions follow resource:action format (e.g., 'todo:create', 'project:delete').
 * 
 * @entity Permission
 */
@Entity('permissions')
@Unique('UQ_permission_name', ['name'])
@Index('IX_permission_category', ['category'])
export class Permission extends BaseEntity {
  @Column({ type: 'varchar', length: 100, unique: true })
  name!: string; // e.g., 'todo:create', 'project:delete', 'user:manage'

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  category?: string; // e.g., 'todo', 'project', 'user', 'organization'

  @OneToMany(() => RolePermission, (rolePermission) => rolePermission.permission)
  rolePermissions!: RolePermission[];
}



