// src/APP.Infrastructure/monitoring/sentry.ts
import * as Sentry from '@sentry/node';

let initialized = false;

/**
 * Initialize Sentry error tracking.
 * Safe to call multiple times - will only initialize once.
 * Does nothing if SENTRY_DSN environment variable is not set.
 */
export function initSentry(): void {
  if (initialized) {
    return;
  }

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    // Sentry is optional - skip initialization if DSN is not configured
    return;
  }

  const tracesSampleRate = parseFloat(
    process.env.SENTRY_TRACES_SAMPLE_RATE || '0.05',
  );

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: isNaN(tracesSampleRate) ? 0.05 : tracesSampleRate,
    // Only send errors in production to reduce noise
    beforeSend(event) {
      // Allow all events to be sent
      return event;
    },
  });

  initialized = true;
}

/**
 * Capture an exception with Sentry.
 * Safe to call even if Sentry is not initialized.
 * 
 * @param exception - The error to capture
 * @param context - Optional additional context
 */
export function captureException(
  exception: unknown,
  context?: Record<string, unknown>,
): void {
  if (!initialized) {
    return;
  }

  if (context) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(exception);
    });
  } else {
    Sentry.captureException(exception);
  }
}

