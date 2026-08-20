import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * Database keep-alive ping used by APP.JOB.
 * Runs SELECT 1 and reports round-trip latency.
 */
@Injectable()
export class DatabasePingService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Ping the database and return latency in milliseconds.
   */
  async ping(): Promise<{ latencyMs: number }> {
    const startedAt = Date.now();

    try {
      await this.dataSource.query('SELECT 1');
      const latencyMs = Date.now() - startedAt;

      this.logger.LogInfo('Database ping succeeded', {
        context: 'DatabasePingService',
        latencyMs,
      });

      return { latencyMs };
    } catch (error) {
      this.logger.LogError('Database ping failed', error as Error, {
        context: 'DatabasePingService',
        latencyMs: Date.now() - startedAt,
      });
      throw error;
    }
  }
}
