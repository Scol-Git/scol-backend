import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { JobServicesModule } from '@bll/job-services/JobServicesModule.module';
import { CronJobRegistrar } from './core/CronJobRegistrar';
import { OtpSessionCleanupJob } from './cron-jobs/otp/OtpSessionCleanupJob';
import { DatabasePingJob } from './cron-jobs/health/DatabasePingJob';
import type { ICronJob } from '@shared/interfaces/jobs/ICronJob.interface';
import { ICronJobs as ICronJobsToken } from '@shared/tokens/injection.tokens';

/**
 * Job Layer (APP.JOB)
 *
 * Owns cron scheduling only. Business logic lives in APP.BLL/job-services.
 * To add a job: implement BaseCronJob, add a JOB_KEYS entry + JobConfig map
 * entry, then append the class to the inject array below.
 */
@Module({
  imports: [ScheduleModule.forRoot(), JobServicesModule],
  providers: [
    OtpSessionCleanupJob,
    DatabasePingJob,
    {
      provide: ICronJobsToken,
      useFactory: (...jobs: ICronJob[]) => jobs,
      inject: [OtpSessionCleanupJob, DatabasePingJob],
    },
    CronJobRegistrar,
  ],
})
export class JobModule {}
