/**
 * Canonical keys for APP.JOB cron jobs.
 * Used by IJobConfig, ICronJob implementations, and the CronJobRegistrar.
 */
export const JOB_KEYS = {
  otpSessionCleanup: 'otpSessionCleanup',
  databasePing: 'databasePing',
} as const;

export type JobKey = (typeof JOB_KEYS)[keyof typeof JOB_KEYS];
