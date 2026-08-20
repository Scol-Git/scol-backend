import type { JobKey } from '@shared/constants/job-keys.constant';

/**
 * Per-job scheduling configuration.
 */
export interface IJobScheduleConfig {
  /** When false, this job is not registered */
  enabled: boolean;
  /** Cron expression for the job */
  cron: string;
}

/**
 * Job Configuration Interface
 *
 * Defines configuration for the APP.JOB scheduling layer:
 * - Global enable/disable for multi-instance deployments
 * - Per-job enabled flag and cron expression
 *
 * @interface IJobConfig
 */
export interface IJobConfig {
  /** When false, no scheduled jobs are registered */
  enabled: boolean;

  /** Per-job configuration keyed by JobKey */
  jobs: Record<JobKey, IJobScheduleConfig>;
}
