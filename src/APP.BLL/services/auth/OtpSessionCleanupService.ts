import { Injectable, Inject } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LessThan } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * OTP Session Cleanup Service
 *
 * Cron job that runs every 5 minutes to clean up expired OTP sessions
 * (both registration and password reset) from the PostgreSQL database.
 *
 * Note: This only cleans up DB records. Redis entries expire automatically via TTL.
 */
@Injectable()
export class OtpSessionCleanupService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Cleanup expired OTP sessions
   * Runs every 5 minutes
   */
  @Cron('*/5 * * * *', {
    name: 'cleanup-expired-otp-sessions',
  })
  async cleanupExpiredOtpSessions(): Promise<void> {
    try {
      const now = new Date();
      const result = await this.db.otpSessions.delete({
        expiresAt: LessThan(now),
      });

      if (result.affected && result.affected > 0) {
        this.logger.LogInfo(
          `Cleaned up ${result.affected} expired OTP session(s)`,
          {
            context: 'OtpSessionCleanupService.cleanupExpiredOtpSessions',
            deletedCount: result.affected,
            action: 'CLEANUP_EXPIRED_OTP_SESSIONS_SUCCESS',
          },
        );
      }
    } catch (error) {
      this.logger.LogError(
        'Failed to cleanup expired OTP sessions',
        error as Error,
        {
          context: 'OtpSessionCleanupService.cleanupExpiredOtpSessions',
          action: 'CLEANUP_EXPIRED_OTP_SESSIONS_FAILED',
        },
      );
    }
  }
}

