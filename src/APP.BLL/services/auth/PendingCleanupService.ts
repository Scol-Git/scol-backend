import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { PendingRegistration } from '@entity/entities/PendingRegistration.entity';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * Pending Cleanup Service
 *
 * Cron job that runs every 5 minutes to clean up expired pending registrations
 * from the PostgreSQL database.
 *
 * Note: This only cleans up DB records. Redis entries expire automatically via TTL.
 */
@Injectable()
export class PendingCleanupService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Cleanup expired pending registrations
   * Runs every 5 minutes
   */
  @Cron('*/5 * * * *', {
    name: 'cleanup-expired-pending-registrations',
  })
  async cleanupExpiredPendingRegistrations(): Promise<void> {
    try {
      const now = new Date();
      const result = await this.db.pendingRegistrations.delete({
        expiresAt: LessThan(now),
      });

      if (result.affected && result.affected > 0) {
        this.logger.LogInfo(
          `Cleaned up ${result.affected} expired pending registration(s)`,
          {
            context: 'PendingCleanupService.cleanupExpiredPendingRegistrations',
            deletedCount: result.affected,
            action: 'CLEANUP_EXPIRED_PENDING_SUCCESS',
          },
        );
      }
    } catch (error) {
      this.logger.LogError(
        'Failed to cleanup expired pending registrations',
        error as Error,
        {
          context: 'PendingCleanupService.cleanupExpiredPendingRegistrations',
          action: 'CLEANUP_EXPIRED_PENDING_FAILED',
        },
      );
    }
  }
}

