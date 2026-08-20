import { Injectable, Inject } from '@nestjs/common';
import { LessThan } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * OTP Session Cleanup Service
 *
 * Deletes expired OTP sessions. Scheduling lives in APP.JOB
 * (OtpSessionCleanupJob); this service stays trigger-agnostic.
 */
@Injectable()
export class OtpSessionCleanupService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Cleanup expired OTP sessions
   *
   * @returns Number of deleted sessions
   */
  async cleanupExpiredOtpSessions(): Promise<number> {
    try {
      const now = new Date();
      const result = await this.db.otpSessions.delete({
        expiresAt: LessThan(now),
      });

      const deletedCount = result.affected || 0;

      if (deletedCount > 0) {
        this.logger.LogInfo(
          `Cleaned up ${deletedCount} expired OTP session(s)`,
          {
            context: 'OtpSessionCleanupService',
            deletedCount,
          },
        );
      }

      return deletedCount;
    } catch (error) {
      this.logger.LogError(
        'Failed to cleanup expired OTP sessions',
        error as Error,
        { context: 'OtpSessionCleanupService' },
      );
      throw error;
    }
  }
}
