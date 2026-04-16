import { Injectable, Inject } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IJwtService, JwtPayload } from '@shared/interfaces/security';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';
import { IPasswordHasher } from '@shared/interfaces/security';
import { IPasswordHasher as IPasswordHasherToken } from '@shared/tokens/injection.tokens';
import { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISecurityConfig as ISecurityConfigToken } from '@shared/tokens/injection.tokens';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';
import { Role } from '@shared/enums/Role.enum';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/** Parse JWT-style expiry string (e.g. 15m, 1h, 7d, 90d) to milliseconds */
function parseExpiryToMs(expiresIn: string): number {
  const m = expiresIn.trim().match(/^(\d+)(s|m|h|d)$/i);
  if (!m) return 7 * 24 * 60 * 60 * 1000; // fallback 7 days
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * (multipliers[unit] ?? multipliers.d);
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
    @Inject(ISecurityConfigToken)
    private readonly securityConfig: ISecurityConfig,
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
      //if user has role SUPER_ADMIN, then isSuperAdmin is true
      isSuperAdmin: user.roles.some(
        (role) => role.name === Role.SUPER_ADMIN.toString(),
      ),
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
    });

    await this.db.userSessions.save(session);

    const accessTokenMs = parseExpiryToMs(
      this.securityConfig.jwt.accessTokenExpiresIn,
    );
    return {
      accessToken,
      refreshToken,
      expiresIn: Math.floor(accessTokenMs / 1000), // seconds until access token expires
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
   * Get refresh token expiry date from JWT_REFRESH_TOKEN_EXPIRES_IN (e.g. 90d)
   */
  private getRefreshTokenExpiry(): Date {
    const ms = parseExpiryToMs(this.securityConfig.jwt.refreshTokenExpiresIn);
    return new Date(Date.now() + ms);
  }
}
