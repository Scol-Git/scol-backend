import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { BaseEntity } from './BaseEntity.template';
import { User } from './User.entity';

/**
 * RefreshToken Entity
 * 
 * Represents a refresh token for JWT token renewal.
 * Tokens are hashed before storage for security.
 * 
 * @entity RefreshToken
 */
@Entity('refresh_tokens')
@Index('IX_refresh_token_user', ['userId'])
@Index('IX_refresh_token_token', ['tokenHash'])
export class RefreshToken extends BaseEntity {
  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 255 })
  tokenHash!: string; // Hashed token value

  @Column({ type: 'timestamptz' })
  expiresAt!: Date;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt?: Date;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;

  @Column({ type: 'text', nullable: true })
  userAgent?: string;

  @ManyToOne(() => User, (user) => user.refreshTokens, { onDelete: 'CASCADE' })
  user!: User;

  /**
   * Check if token is expired
   */
  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  /**
   * Check if token is revoked
   */
  isRevoked(): boolean {
    return this.revokedAt !== null && this.revokedAt !== undefined;
  }

  /**
   * Check if token is valid (not expired and not revoked)
   */
  isValid(): boolean {
    return !this.isExpired() && !this.isRevoked();
  }
}



