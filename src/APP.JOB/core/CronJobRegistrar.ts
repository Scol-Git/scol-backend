import { Inject, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import type { ICronJob } from '@shared/interfaces/jobs/ICronJob.interface';
import type { IJobConfig } from '@shared/interfaces/config/IJobConfig.interface';
import type { ILogger } from '@shared/interfaces/logging';
import {
  ICronJobs as ICronJobsToken,
  IJobConfig as IJobConfigToken,
  ILogger as ILoggerToken,
} from '@shared/tokens/injection.tokens';

/**
 * Discovers all ICronJob providers and registers them with SchedulerRegistry
 * based on IJobConfig (global + per-job enable flags and cron expressions).
 */
@Injectable()
export class CronJobRegistrar implements OnModuleInit, OnModuleDestroy {
  private readonly registeredNames: string[] = [];

  constructor(
    @Inject(ICronJobsToken) private readonly jobs: ICronJob[],
    private readonly schedulerRegistry: SchedulerRegistry,
    @Inject(IJobConfigToken) private readonly jobConfig: IJobConfig,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  onModuleInit(): void {
    if (!this.jobConfig.enabled) {
      this.logger.LogInfo('All cron jobs skipped (JOBS_ENABLED=false)', {
        context: 'CronJobRegistrar',
      });
      return;
    }

    const registered: string[] = [];
    const skipped: string[] = [];

    for (const job of this.jobs) {
      const schedule = this.jobConfig.jobs[job.key];
      if (!schedule?.enabled) {
        skipped.push(job.key);
        continue;
      }

      if (this.schedulerRegistry.doesExist('cron', job.key)) {
        this.schedulerRegistry.deleteCronJob(job.key);
      }

      const cronJob = CronJob.from({
        cronTime: schedule.cron,
        onTick: () => {
          void job.execute();
        },
        start: true,
        name: job.key,
      });

      this.schedulerRegistry.addCronJob(job.key, cronJob);
      this.registeredNames.push(job.key);
      registered.push(`${job.key} (${schedule.cron})`);
    }

    this.logger.LogInfo('Cron jobs registered', {
      context: 'CronJobRegistrar',
      registered,
      skipped,
    });
  }

  onModuleDestroy(): void {
    for (const name of this.registeredNames) {
      if (this.schedulerRegistry.doesExist('cron', name)) {
        this.schedulerRegistry.deleteCronJob(name);
      }
    }
  }
}
