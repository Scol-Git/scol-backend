import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

@Injectable()
export class AccountLockoutMaintenanceService {
  private readonly decayHours: number;

  constructor(
    private readonly db: AppDbContext,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    config: ConfigService,
  ) {
    this.decayHours =
      config.get<number>('AUTH_FAILED_ATTEMPT_DECAY_HOURS') ?? 24;
  }

  async releaseExpiredLocks(): Promise<number> {
    const now = new Date();
    const result = await this.db.users
      .createQueryBuilder()
      .update()
      .set({
        accountStatus: AccountStatus.Active,
        failedLoginAttempts: 0,
        lockedUntil: () => 'NULL',
      })
      .where('accountStatus = :locked', { locked: AccountStatus.Locked })
      .andWhere('lockedUntil IS NOT NULL')
      .andWhere('lockedUntil <= :now', { now })
      .execute();

    return result.affected ?? 0;
  }

  async decayStaleFailedAttempts(): Promise<number> {
    const cutoff = new Date(Date.now() - this.decayHours * 60 * 60 * 1000);
    const result = await this.db.users
      .createQueryBuilder()
      .update()
      .set({ failedLoginAttempts: 0 })
      .where('accountStatus != :locked', { locked: AccountStatus.Locked })
      .andWhere('failedLoginAttempts > 0')
      .andWhere('lastFailedLoginAt IS NOT NULL')
      .andWhere('lastFailedLoginAt < :cutoff', { cutoff })
      .execute();

    return result.affected ?? 0;
  }

  async runMaintenance(): Promise<{ locksReleased: number; attemptsDecayed: number }> {
    const locksReleased = await this.releaseExpiredLocks();
    const attemptsDecayed = await this.decayStaleFailedAttempts();

    if (locksReleased > 0 || attemptsDecayed > 0) {
      this.logger.LogInfo('Account lockout maintenance completed', {
        context: 'AccountLockoutMaintenanceService',
        locksReleased,
        attemptsDecayed,
      });
    }

    return { locksReleased, attemptsDecayed };
  }
}
