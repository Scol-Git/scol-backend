import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CronExpression } from '@nestjs/schedule';
import { JOB_KEYS } from '@shared/constants/job-keys.constant';
import type {
  IJobConfig,
  IJobScheduleConfig,
} from '@shared/interfaces/config/IJobConfig.interface';

/**
 * Job Configuration Service
 *
 * Provides type-safe access to APP.JOB scheduling configuration.
 * Implements IJobConfig for dependency injection.
 *
 * Cron jobs require a persistent Node process. Disable via JOBS_ENABLED=false
 * when running multiple replicas and only one instance should own the scheduler.
 */
@Injectable()
export class JobConfig implements IJobConfig {
  enabled: boolean =
    this._config.get<string>('JOBS_ENABLED', 'true') === 'true';

  jobs: IJobConfig['jobs'] = {
    [JOB_KEYS.otpSessionCleanup]: this.readJobSchedule(
      'OTP_SESSION_CLEANUP',
      CronExpression.EVERY_30_MINUTES,
    ),
    [JOB_KEYS.databasePing]: this.readJobSchedule(
      'DB_PING',
      CronExpression.EVERY_5_MINUTES,
    ),
    [JOB_KEYS.userSessionCleanup]: this.readJobSchedule(
      'USER_SESSION_CLEANUP',
      CronExpression.EVERY_DAY_AT_3AM,
    ),
    [JOB_KEYS.accountLockoutMaintenance]: this.readJobSchedule(
      'ACCOUNT_LOCKOUT_MAINTENANCE',
      CronExpression.EVERY_10_MINUTES,
    ),
  };

  constructor(private readonly _config: ConfigService) {}

  private readJobSchedule(
    envPrefix: string,
    defaultCron: string,
  ): IJobScheduleConfig {
    return {
      enabled:
        this._config.get<string>(`${envPrefix}_ENABLED`, 'true') === 'true',
      cron: this._config.get<string>(`${envPrefix}_CRON`, defaultCron)!,
    };
  }
}
