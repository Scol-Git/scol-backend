import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LessThan, IsNull, Not } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

const BATCH_SIZE = 2000;

@Injectable()
export class UserSessionCleanupService {
  private readonly retentionDays: number;

  constructor(
    private readonly db: AppDbContext,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    config: ConfigService,
  ) {
    this.retentionDays =
      config.get<number>('AUTH_USER_SESSION_RETENTION_DAYS') ?? 30;
  }

  async cleanupExpiredSessions(): Promise<number> {
    const cutoff = new Date(
      Date.now() - this.retentionDays * 24 * 60 * 60 * 1000,
    );
    let totalDeleted = 0;

    while (true) {
      const batch = await this.db.userSessions.find({
        where: [
          { expiresAt: LessThan(cutoff) },
          {
            revokedAt: Not(IsNull()),
          },
        ],
        take: BATCH_SIZE,
        select: ['id', 'expiresAt', 'revokedAt'],
      });

      const toDelete = batch.filter(
        (s) =>
          s.expiresAt < cutoff ||
          (s.revokedAt !== null && s.revokedAt !== undefined && s.revokedAt < cutoff),
      );

      if (toDelete.length === 0) {
        break;
      }

      const ids = toDelete.map((s) => s.id);
      const result = await this.db.userSessions.delete(ids);
      totalDeleted += result.affected ?? 0;

      if (toDelete.length < BATCH_SIZE) {
        break;
      }
    }

    if (totalDeleted > 0) {
      this.logger.LogInfo('User session cleanup completed', {
        context: 'UserSessionCleanupService',
        deleted: totalDeleted,
      });
    }

    return totalDeleted;
  }
}
