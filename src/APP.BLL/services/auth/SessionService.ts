import { Injectable, Inject } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { randomUUID } from 'crypto';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { IRevocationRegistry } from '@shared/interfaces/security';
import {
  IRevocationRegistry as IRevocationRegistryToken,
} from '@shared/tokens/injection.tokens';
import { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISecurityConfig as ISecurityConfigToken } from '@shared/tokens/injection.tokens';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';
import { TokenService, TokenPair } from './TokenService';
import { TokenRefreshResponseDto } from '@shared/dtos/auth/TokenRefreshResponseDto';
import { InvalidTokenException } from '@shared/exceptions/auth/InvalidTokenException';
import { IJwtService } from '@shared/interfaces/security';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';
import { digestRefreshToken } from '@shared/utils/tokenDigest.util';
import { parseJwtExpiryToMs } from '@shared/utils/jwtExpiry.util';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { LeadProfileService } from '@bll/services/leads/LeadProfileService';
import { InvalidCredentialsException } from '@shared/exceptions/auth/InvalidCredentialsException';

@Injectable()
export class SessionService {
  constructor(
    private readonly db: AppDbContext,
    private readonly tokenService: TokenService,
    @Inject(IJwtServiceToken) private readonly jwt: IJwtService,
    @Inject(IRevocationRegistryToken)
    private readonly revocation: IRevocationRegistry,
    @Inject(ISecurityConfigToken)
    private readonly securityConfig: ISecurityConfig,
    private readonly leadProfileService: LeadProfileService,
  ) {}

  async createSession(
    user: SysUsers,
    ip?: string,
    userAgent?: string,
  ): Promise<TokenPair> {
    const loadedUser = await this.tokenService.ensureUserWithAuthRelations(user);
    const sessionId = randomUUID();
    const tokens = this.tokenService.issueTokensForSession(
      loadedUser,
      sessionId,
    );
    const refreshDigest = digestRefreshToken(tokens.refreshToken);
    const session = this.db.userSessions.create({
      id: sessionId,
      userId: loadedUser.id,
      refreshTokenHash: refreshDigest,
      expiresAt: this.getRefreshTokenExpiry(),
      ipAddress: ip,
      userAgent,
      lastUsedAt: new Date(),
    });
    await this.db.userSessions.save(session);
    return tokens;
  }

  async refreshAccessToken(
    refreshToken: string,
  ): Promise<TokenRefreshResponseDto> {
    let payload;
    try {
      payload = this.jwt.verifyToken(refreshToken, 'refresh');
    } catch {
      throw new InvalidTokenException('Invalid refresh token provided');
    }

    const session = await this.db.userSessions.findOne({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: IsNull(),
      },
      relations: { SysUser: { roles: true, permissions: true } },
    });

    if (!session || session.deletedAt) {
      throw new InvalidTokenException('Invalid refresh token provided');
    }

    const digest = digestRefreshToken(refreshToken);
    if (session.refreshTokenHash !== digest) {
      throw new InvalidTokenException('Invalid refresh token provided');
    }

    if (session.expiresAt < new Date()) {
      throw new InvalidTokenException('Refresh token has expired');
    }

    const user = session.SysUser;
    if (!user) {
      throw new InvalidTokenException('Invalid refresh token provided');
    }

    if (
      user.accountStatus === AccountStatus.Suspended ||
      user.accountStatus === AccountStatus.Inactive ||
      user.accountStatus === AccountStatus.NotValid
    ) {
      throw new InvalidCredentialsException();
    }

    const tokens = this.tokenService.issueTokensForSession(user, session.id);
    session.lastUsedAt = new Date();
    session.expiresAt = this.slideSessionExpiry(session);
    await this.db.userSessions.save(session);

    const academicFormStatus =
      await this.leadProfileService.determinedAcademicFormStatus(user.id);

    return {
      user: {
        userId: user.id,
        academicFormStatus,
        userRole: user.roles?.map((role) => role.name) ?? [],
      },
      accessToken: tokens.accessToken,
    };
  }

  async logoutCurrentSession(sessionId: string, userId: string): Promise<void> {
    await this.revocation.revokeSession(sessionId, userId, 'logout');
  }

  async logoutAll(userId: string, reason = 'logout_all'): Promise<void> {
    await this.revocation.revokeAllUserSessions(userId, reason);
  }

  private getRefreshTokenExpiry(): Date {
    const ms = parseJwtExpiryToMs(
      this.securityConfig.jwt.refreshTokenExpiresIn,
    );
    return new Date(Date.now() + ms);
  }

  private slideSessionExpiry(session: UserSessions): Date {
    const refreshMs = parseJwtExpiryToMs(
      this.securityConfig.jwt.refreshTokenExpiresIn,
    );
    const absoluteMs = parseJwtExpiryToMs(
      this.securityConfig.jwt.sessionAbsoluteMax,
    );
    const createdAt = session.createdAt.getTime();
    const absoluteCap = new Date(createdAt + absoluteMs);
    const slid = new Date(Date.now() + refreshMs);
    return slid < absoluteCap ? slid : absoluteCap;
  }
}
