/**
 * Application Stage Helper
 *
 * Use APP_STAGE for stage-dependent logic (dev/qa/prod).
 * Use NODE_ENV only for framework behavior (development/production).
 *
 * Examples:
 * - SMS provider: 'console' in dev, 'api' in qa/prod
 * - Cron secret validation: skip in dev, required in qa/prod
 * - Sentry environment tag: use APP_STAGE
 */
export type AppStage = 'dev' | 'qa' | 'prod';

/**
 * Get the current application stage
 * @returns 'dev' | 'qa' | 'prod'
 */
export function getAppStage(): AppStage {
  const stage = (process.env.APP_STAGE || 'dev').toLowerCase();

  if (stage === 'prod' || stage === 'production') {
    return 'prod';
  }
  if (stage === 'qa' || stage === 'staging') {
    return 'qa';
  }
  return 'dev';
}

/**
 * Check if running in development stage
 */
export function isDev(): boolean {
  return getAppStage() === 'dev';
}

/**
 * Check if running in production stage
 */
export function isProd(): boolean {
  return getAppStage() === 'prod';
}

/**
 * Check if running in QA stage
 */
export function isQa(): boolean {
  return getAppStage() === 'qa';
}
