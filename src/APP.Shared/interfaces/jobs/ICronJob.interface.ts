import type { JobKey } from '@shared/constants/job-keys.constant';

/**
 * Contract for a schedulable cron job.
 * Implementations live in APP.JOB; CronJobRegistrar discovers them via ICronJobs.
 */
export interface ICronJob {
  readonly key: JobKey;
  execute(): Promise<void>;
}
