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
import { SysRoles } from './SysRoles.entity';

/**
 * @class UserRoles
 *
 * Junction table for Many-to-Many relationship between Users and Roles.
 * Uses composite primary key (normalized) with audit fields.
 *
 * Normalized Structure:
 * - Composite Primary Key: (user_id, role_id) - prevents duplicate relationships
 * - Foreign Keys: user_id -> sys_Users.id, role_id -> sys_Roles.id
 * - Audit Fields: createdAt, updatedAt - tracks when relationship was created/modified
 * - No surrogate key (id) - follows 3NF normalization
 *
 * In EF Core, this would be configured as:
 * ```csharp
 * modelBuilder.Entity<UserRole>(entity =>
 * {
 *     entity.HasKey(ur => new { ur.UserId, ur.RoleId });
 *     entity.Property(ur => ur.CreatedAt).HasDefaultValueSql("now()");
 *     entity.Property(ur => ur.UpdatedAt).HasDefaultValueSql("now()");
 * });
 * ```
 */
@Entity('UserRoles')
export class UserRoles {
  @PrimaryColumn({
    name: 'user_id',
    type: 'uuid',
  })
  @AutoMap()
  userId!: string;

  @PrimaryColumn({
    name: 'role_id',
    type: 'uuid',
  })
  @AutoMap()
  roleId!: string;

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
  @ManyToOne(() => SysUsers, (user) => user.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: SysUsers;

  /**
   * Many-to-One: Role
   * Direct access to the role in this junction
   */
  @ManyToOne(() => SysRoles, (role) => role.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role!: SysRoles;
}
