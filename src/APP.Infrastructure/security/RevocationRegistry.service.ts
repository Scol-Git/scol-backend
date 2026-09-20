import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
} from '@nestjs/common';
import { IsNull, MoreThan } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { RedisConnectionService } from '@infra/redis/RedisConnectionService.service';
import type { IRevocationRegistry } from '@shared/interfaces/security';
import type { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import {
  ISecurityConfig as ISecurityConfigToken,
  ILogger as ILoggerToken,
} from '@shared/tokens/injection.tokens';
import type { ILogger } from '@shared/interfaces/logging';
import { parseJwtExpiryToMs } from '@shared/utils/jwtExpiry.util';

const REDIS_KEY = 'auth:rev:log';
const TRIM_INTERVAL_MS = 60_000;

@Injectable()
export class RevocationRegistry
  implements IRevocationRegistry, OnModuleInit, OnModuleDestroy
{
  /** member -> revokedAt epoch seconds */
  private readonly entries = new Map<string, number>();
  private trimTimer: ReturnType<typeof setInterval> | null = null;
  private readonly retentionMs: number;

  constructor(
    private readonly db: AppDbContext,
    private readonly redis: RedisConnectionService,
    @Inject(ISecurityConfigToken)
    private readonly securityConfig: ISecurityConfig,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {
    this.retentionMs = parseJwtExpiryToMs(
      this.securityConfig.jwt.accessTokenExpiresIn,
    );
  }

  async onModuleInit(): Promise<void> {
    await this.warmUp();
    this.trimTimer = setInterval(() => {
      void this.trim();
    }, TRIM_INTERVAL_MS);
  }

  onModuleDestroy(): void {
    if (this.trimTimer) {
      clearInterval(this.trimTimer);
      this.trimTimer = null;
    }
  }

  isRevoked(params: {
    sessionId?: string;
    userId: string;
    tokenIssuedAt: number;
  }): boolean {
    const { sessionId, userId, tokenIssuedAt } = params;
    if (sessionId) {
      const sessionRevokedAt = this.entries.get(`s:${sessionId}`);
      if (sessionRevokedAt !== undefined && sessionRevokedAt > tokenIssuedAt) {
        return true;
      }
    }
    const userRevokedAt = this.entries.get(`u:${userId}`);
    return userRevokedAt !== undefined && userRevokedAt > tokenIssuedAt;
  }

  async revokeSession(
    sessionId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const now = new Date();
    await this.db.userSessions.update(
      { id: sessionId, userId },
      { revokedAt: now, revokedReason: reason ?? 'logout' },
    );
    await this.recordRevocation(`s:${sessionId}`, now);
  }

  async revokeAllUserSessions(
    userId: string,
    reason?: string,
  ): Promise<void> {
    const now = new Date();
    await this.db.userSessions.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: now, revokedReason: reason ?? 'logout_all' },
    );
    await this.recordRevocation(`u:${userId}`, now);
  }

  async warmUp(): Promise<void> {
    const cutoffEpoch = this.cutoffEpochSeconds();
    const loadedFromRedis = await this.loadFromRedis(cutoffEpoch);
    if (!loadedFromRedis) {
      await this.loadFromDatabase(cutoffEpoch);
    }
    this.logger.LogInfo('Revocation registry warmed', {
      context: 'RevocationRegistry',
      entryCount: this.entries.size,
    });
  }

  private async recordRevocation(
    member: string,
    at: Date,
  ): Promise<void> {
    const epochSeconds = Math.floor(at.getTime() / 1000);
    this.entries.set(member, epochSeconds);
    const client = this.redis.getClient();
    if (client && this.redis.isAvailable) {
      try {
        await client.zadd(REDIS_KEY, epochSeconds, member);
      } catch (error) {
        this.logger.LogError(
          'Failed to persist revocation to Redis',
          error as Error,
          { context: 'RevocationRegistry', member },
        );
      }
    }
  }

  private async loadFromRedis(cutoffEpoch: number): Promise<boolean> {
    const client = this.redis.getClient();
    if (!client || !this.redis.isAvailable) {
      return false;
    }
    try {
      await client.zremrangebyscore(REDIS_KEY, '-inf', cutoffEpoch);
      const rows = await client.zrangebyscore(
        REDIS_KEY,
        cutoffEpoch,
        '+inf',
        'WITHSCORES',
      );
      for (let i = 0; i < rows.length; i += 2) {
        const member = rows[i];
        const score = parseInt(rows[i + 1], 10);
        this.entries.set(member, score);
      }
      return true;
    } catch (error) {
      this.logger.LogError(
        'Failed to warm revocation registry from Redis',
        error as Error,
        { context: 'RevocationRegistry' },
      );
      return false;
    }
  }

  private async loadFromDatabase(cutoffEpoch: number): Promise<void> {
    const cutoffDate = new Date(cutoffEpoch * 1000);
    const sessions = await this.db.userSessions.find({
      where: { revokedAt: MoreThan(cutoffDate) },
      select: ['id', 'userId', 'revokedAt'],
    });
    for (const session of sessions) {
      if (!session.revokedAt) {
        continue;
      }
      const epoch = Math.floor(session.revokedAt.getTime() / 1000);
      this.entries.set(`s:${session.id}`, epoch);
    }
    this.logger.LogInfo('Revocation registry warmed from database fallback', {
      context: 'RevocationRegistry',
      sessionCount: sessions.length,
    });
  }

  private cutoffEpochSeconds(): number {
    return Math.floor((Date.now() - this.retentionMs) / 1000);
  }

  private async trim(): Promise<void> {
    const cutoffEpoch = this.cutoffEpochSeconds();
    for (const [member, score] of this.entries.entries()) {
      if (score < cutoffEpoch) {
        this.entries.delete(member);
      }
    }
    const client = this.redis.getClient();
    if (client && this.redis.isAvailable) {
      try {
        await client.zremrangebyscore(REDIS_KEY, '-inf', cutoffEpoch);
      } catch {
        // fail-open
      }
    }
  }
}
