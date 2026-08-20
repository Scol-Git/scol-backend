import type { ICronJob } from '@shared/interfaces/jobs/ICronJob.interface';
import type { JobKey } from '@shared/constants/job-keys.constant';
import type { ILogger } from '@shared/interfaces/logging';

/**
 * Shared cron job lifecycle: overlap guard, timing, logging, and error isolation.
 * Subclasses implement only `run()` and expose `key` + a logger.
 */
export abstract class BaseCronJob implements ICronJob {
  abstract readonly key: JobKey;

  private isRunning = false;

  protected abstract readonly logger: ILogger;

  /**
   * Job-specific work. Optional return value is merged into the completion log.
   */
  protected abstract run(): Promise<Record<string, unknown> | void>;

  async execute(): Promise<void> {
    if (this.isRunning) {
      this.logger.LogWarning('Cron job skipped (already running)', {
        context: this.key,
      });
      return;
    }

    this.isRunning = true;
    const startedAt = Date.now();
    this.logger.LogInfo('Cron job started', { context: this.key });

    try {
      const result = await this.run();
      this.logger.LogInfo('Cron job completed', {
        context: this.key,
        durationMs: Date.now() - startedAt,
        ...(result ?? {}),
      });
    } catch (error) {
      this.logger.LogError('Cron job failed', error as Error, {
        context: this.key,
        durationMs: Date.now() - startedAt,
      });
    } finally {
      this.isRunning = false;
    }
  }
}
