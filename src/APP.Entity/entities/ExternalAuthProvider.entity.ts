import { Column, Entity, Index, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from './BaseEntity.template';
import { User } from './User.entity';

/**
 * ExternalAuthProvider Entity
 * 
 * Represents an external authentication provider (Google, etc.) linked to a user account.
 * Stores provider-specific information and encrypted tokens.
 * 
 * @entity ExternalAuthProvider
 */
@Entity('external_auth_providers')
@Unique('UQ_provider_user', ['providerName', 'providerUserId'])
@Index('IX_provider_user', ['userId'])
export class ExternalAuthProvider extends BaseEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 50 })
  providerName!: string; // e.g., 'google', 'microsoft', 'github'

  @Column({ type: 'varchar', length: 255 })
  providerUserId!: string; // User ID from the external provider

  @Column({ type: 'text', nullable: true })
  accessToken?: string; // Encrypted access token

  @Column({ type: 'text', nullable: true })
  refreshToken?: string; // Encrypted refresh token

  @Column({ type: 'timestamptz', nullable: true })
  tokenExpiresAt?: Date;

  @ManyToOne(() => User, (user) => user.externalAuthProviders, {
    onDelete: 'CASCADE',
  })
  user!: User;
}



