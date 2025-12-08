import { Injectable, Inject } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IJwtService, JwtPayload } from '@shared/interfaces/security';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';
import { IPasswordHasher } from '@shared/interfaces/security';
import { IPasswordHasher as IPasswordHasherToken } from '@shared/tokens/injection.tokens';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Token Service
 *
 * Manages JWT token generation and refresh token sessions.
 * Builds JWT payload from user entity with roles and permissions.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(IJwtServiceToken) private readonly jwt: IJwtService,
    @Inject(IPasswordHasherToken) private readonly hasher: IPasswordHasher,
  ) {}

  /**
   * Issue access + refresh token pair
   * @param user User entity (must include roles and permissions relations)
   * @param ip Client IP address
   * @param userAgent Client user agent
   * @returns Token pair
   */
  async issueTokenPair(
    user: SysUsers,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    // Ensure user has roles and permissions loaded
    if (!user.roles || !user.permissions) {
      const loadedUser = await this.db.users.findOne({
        where: { id: user.id },
        relations: { roles: true, permissions: true },
      });

      if (loadedUser) {
        user = loadedUser;
      }
    }

    // Build JWT payload
    const payload: JwtPayload = {
      sub: user.id,
      orgId: '', // Set org ID if needed
      email: user.email || user.phone, // Fallback to phone if email not set
      roles: user.roles.map((role) => role.name),
      permissions: user.permissions.map((perm) => perm.name),
      isSuperAdmin: false, // Set based on your logic
    };

    // Generate tokens
    const accessToken = this.jwt.generateAccessToken(payload);
    const refreshToken = this.jwt.generateRefreshToken(payload);

    // Hash and store refresh token
    const refreshTokenHash = await this.hasher.hash(refreshToken);

    const session = this.db.userSessions.create({
      userId: user.id,
      refreshTokenHash,
      expiresAt: this.getRefreshTokenExpiry(),
      ipAddress: ip,
      userAgent,
      user,
    });

    await this.db.userSessions.save(session);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes default - should match JWT config
    };
  }

  /**
   * Revoke refresh token
   * @param userId User ID
   * @param tokenHash Refresh token hash
   */
  async revokeRefreshToken(userId: string, tokenHash: string): Promise<void> {
    await this.db.userSessions.update(
      { userId, refreshTokenHash: tokenHash },
      { revokedAt: new Date() },
    );
  }

  /**
   * Revoke all user sessions
   * @param userId User ID
   */
  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.db.userSessions.update(
      { userId, revokedAt: null as any },
      { revokedAt: new Date() },
    );
  }

  /**
   * Get refresh token expiry date
   * @returns Date 7 days from now (default)
   */
  private getRefreshTokenExpiry(): Date {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 7); // 7 days
    return expiryDate;
  }
}

