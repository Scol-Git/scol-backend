import { Column, Entity, Index, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './BaseEntity.template';
import { User } from './User.entity';
import { Role } from './Role.entity';

/**
 * UserRole Junction Entity
 * 
 * Represents the many-to-many relationship between Users and Roles.
 * Includes organization context and audit information.
 * 
 * @entity UserRole
 */
@Entity('user_roles')
@Unique('UQ_user_role_org', ['userId', 'roleId', 'orgId'])
@Index('IX_user_role_user', ['userId'])
@Index('IX_user_role_role', ['roleId'])
@Index('IX_user_role_org', ['orgId'])
export class UserRole extends BaseEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'uuid' })
  roleId!: string;

  @Column({ type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => User, (user) => user.userRoles, { onDelete: 'CASCADE' })
  user!: User;

  @ManyToOne(() => Role, (role) => role.userRoles, { onDelete: 'CASCADE' })
  role!: Role;

  @Column({ type: 'uuid', nullable: true })
  assignedBy?: string; // User ID who assigned this role
}



