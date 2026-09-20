import { Injectable, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import {
  IJwtService,
  AccessTokenClaims,
} from '@shared/interfaces/security';
import {
  IJwtService as IJwtServiceToken,
} from '@shared/tokens/injection.tokens';
import { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISecurityConfig as ISecurityConfigToken } from '@shared/tokens/injection.tokens';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { Role } from '@shared/enums/Role.enum';
import { parseJwtExpiryToSeconds } from '@shared/utils/jwtExpiry.util';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
}

/**
 * Single source of truth for JWT claim construction and token issuance.
 */
@Injectable()
export class TokenService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(IJwtServiceToken) private readonly jwt: IJwtService,
    @Inject(ISecurityConfigToken)
    private readonly securityConfig: ISecurityConfig,
  ) {}

  /**
   * Build access-token claims from a user entity with roles and permissions loaded.
   */
  buildAccessClaims(
    user: SysUsers,
    sessionId: string,
    jti?: string,
  ): AccessTokenClaims {
    const roles = user.roles?.map((role) => role.name) ?? [];
    const permissions = user.permissions?.map((perm) => perm.name) ?? [];
    return {
      sub: user.id,
      sid: sessionId,
      jti: jti ?? randomUUID(),
      orgId: '',
      email: user.email || user.phone,
      roles,
      permissions,
      isSuperAdmin: roles.some(
        (role) => role === Role.SUPER_ADMIN.toString(),
      ),
    };
  }

  /**
   * Mint access + refresh tokens for an existing session.
   */
  issueTokensForSession(user: SysUsers, sessionId: string): TokenPair {
    const accessClaims = this.buildAccessClaims(user, sessionId);
    const accessToken = this.jwt.generateAccessToken(accessClaims);
    const refreshToken = this.jwt.generateRefreshToken({
      sub: user.id,
      sid: sessionId,
    });
    const accessTokenSeconds = parseJwtExpiryToSeconds(
      this.securityConfig.jwt.accessTokenExpiresIn,
    );
    return {
      accessToken,
      refreshToken,
      expiresIn: accessTokenSeconds,
      sessionId,
    };
  }

  /**
   * Ensure user has roles and permissions loaded.
   */
  async ensureUserWithAuthRelations(user: SysUsers): Promise<SysUsers> {
    if (user.roles && user.permissions) {
      return user;
    }
    const loaded = await this.db.users.findOne({
      where: { id: user.id },
      relations: { roles: true, permissions: true },
    });
    if (!loaded) {
      return user;
    }
    return loaded;
  }
}
