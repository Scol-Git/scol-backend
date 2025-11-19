import { Column, Entity, Index, ManyToOne, OneToMany, Unique } from 'typeorm';
import { BaseEntity } from './BaseEntity.template';
import { Organization } from './Organization.entity';
import { Todo } from './Todo.entity';
import { UserRole } from './UserRole.entity';
import { ExternalAuthProvider } from './ExternalAuthProvider.entity';
import { RefreshToken } from './RefreshToken.entity';
import { UserStatus } from '@shared/enums/UserStatus.enum';

@Entity('users')
@Unique('UQ_user_org_email', ['orgId', 'email'])
@Index('IX_user_org', ['orgId'])
@Index('IX_user_email', ['email'])
export class User extends BaseEntity {
  @Column({ type: 'uuid' })
  orgId!: string;

  @ManyToOne(() => Organization, (o) => o.users, { onDelete: 'CASCADE' })
  org!: Organization;

  @Column({ type: 'varchar', length: 320 })
  email!: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  passwordHash?: string; // Optional for OAuth-only users

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.Active,
  })
  status!: UserStatus;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  emailVerificationToken?: string;

  @Column({ type: 'timestamptz', nullable: true })
  emailVerifiedAt?: Date;

  @Column({ type: 'timestamptz', nullable: true })
  lastLoginAt?: Date;

  @Column({ type: 'int', default: 0 })
  failedLoginAttempts!: number;

  @Column({ type: 'timestamptz', nullable: true })
  lockedUntil?: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordResetToken?: string;

  @Column({ type: 'timestamptz', nullable: true })
  passwordResetTokenExpiresAt?: Date;

  // Relationships
  @OneToMany(() => Todo, (t) => t.assignee)
  todos!: Todo[];

  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles!: UserRole[];

  @OneToMany(() => ExternalAuthProvider, (provider) => provider.user)
  externalAuthProviders!: ExternalAuthProvider[];

  @OneToMany(() => RefreshToken, (token) => token.user)
  refreshTokens!: RefreshToken[];

  /**
   * Check if user account is locked
   */
  isLocked(): boolean {
    if (this.status === UserStatus.Locked) {
      return true;
    }
    if (this.lockedUntil && this.lockedUntil > new Date()) {
      return true;
    }
    return false;
  }

  /**
   * Check if user can log in
   */
  canLogin(): boolean {
    return this.status === UserStatus.Active && !this.isLocked();
  }
}
