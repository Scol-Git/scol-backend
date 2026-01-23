import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { SysUsers } from './SysUsers.entity';
import { SysPermissions } from './SysPermissions.entity';

/**
 * @class UserPermissions
 *
 * Junction table for Many-to-Many relationship between Users and Permissions.
 * Uses composite primary key (normalized) with audit fields.
 *
 * Normalized Structure:
 * - Composite Primary Key: (user_id, permission_id) - prevents duplicate relationships
 * - Foreign Keys: user_id -> sys_Users.id, permission_id -> sys_Permissions.id
 * - Audit Fields: createdAt, updatedAt - tracks when relationship was created/modified
 * - No surrogate key (id) - follows 3NF normalization
 *
 * In EF Core, this would be configured as:
 * ```csharp
 * modelBuilder.Entity<UserPermission>(entity =>
 * {
 *     entity.HasKey(up => new { up.UserId, up.PermissionId });
 *     entity.Property(up => up.CreatedAt).HasDefaultValueSql("now()");
 *     entity.Property(up => up.UpdatedAt).HasDefaultValueSql("now()");
 * });
 * ```
 */
@Entity('UserPermissions')
export class UserPermissions {
  @PrimaryColumn({
    name: 'user_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  userId!: string;

  @PrimaryColumn({
    name: 'permission_id',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  permissionId!: string;

  /**
   * Audit field: When the relationship was created
   * Automatically set on insert
   */
  @CreateDateColumn({
    name: 'createdAt',
    type: 'timestamptz',
  })
  @AutoMap()
  createdAt!: Date;

  /**
   * Audit field: When the relationship was last updated
   * Automatically updated on save
   */
  @UpdateDateColumn({
    name: 'updatedAt',
    type: 'timestamptz',
  })
  @AutoMap()
  updatedAt!: Date;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  /**
   * Many-to-One: User
   * Direct access to the user in this junction
   */
  @ManyToOne(() => SysUsers, (user) => user.permissions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  SysUser!: SysUsers;

  /**
   * Many-to-One: Permission
   * Direct access to the permission in this junction
   */
  @ManyToOne(() => SysPermissions, (permission) => permission.SysUser, {
    onDelete: 'CASCADE',  
  })
  @JoinColumn({ name: 'permission_id' })
  SysPermission!: SysPermissions;
}
