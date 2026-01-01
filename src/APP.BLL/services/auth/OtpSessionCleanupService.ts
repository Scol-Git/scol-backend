import { Injectable, Inject } from '@nestjs/common';
import { LessThan } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * OTP Session Cleanup Service
 *
 * Cleans up expired OTP sessions from the PostgreSQL database.
 *
 * NOTE: In serverless environments (Vercel), this is triggered via HTTP endpoint
 * at /internal/cron/otp-sessions by Vercel Cron Jobs.
 * The @Cron decorator does NOT work reliably in serverless environments
 * because there's no persistent process to schedule cron jobs.
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
   * Called by:
   * - Vercel Cron via /internal/cron/otp-sessions (production/qa)
   * - Can be called manually for testing
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
