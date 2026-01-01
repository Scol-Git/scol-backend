import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { RedisConnectionService } from '@infra/redis/RedisConnectionService.service';
import { getAppStage } from '@infra/config/getAppStage';

/**
 * Health Check Service
 *
 * Provides health check operations for infrastructure components.
 * Follows .NET health check pattern (IHealthCheck interface).
 */
@Injectable()
export class HealthCheckService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly redisConnection: RedisConnectionService,
  ) {}

  /**
   * Get basic health status (liveness probe)
   */
  getHealth(): { status: 'ok'; stage: string; timestamp: string } {
    return {
      status: 'ok',
      stage: getAppStage(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check database connectivity
   */
  async checkDatabase(): Promise<'ok' | 'error'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'ok';
    } catch {
      return 'error';
    }
  }

  /**
   * Check Redis connectivity
   */
  async checkRedis(): Promise<'ok' | 'error' | 'not_configured'> {
    try {
      // Check if Redis is configured
      if (!this.redisConnection.redisUrl) {
        return 'not_configured';
      }

      // Check if Redis is available
      if (!this.redisConnection.isAvailable) {
        return 'error';
      }

      // Try to ping Redis
      const client = this.redisConnection.getClient();
      if (!client) {
        return 'error';
      }

      await client.ping();
      return 'ok';
    } catch {
      return 'error';
    }
  }

  /**
   * Get full readiness status (readiness probe)
   * Checks all infrastructure dependencies
   */
  async getReadiness(): Promise<{
    status: 'ok' | 'degraded';
    stage: string;
    checks: {
      database: 'ok' | 'error';
      redis: 'ok' | 'error' | 'not_configured';
    };
    timestamp: string;
  }> {
    const dbStatus = await this.checkDatabase();
    const redisStatus = await this.checkRedis();

    // Consider system healthy if DB is ok
    // Redis is optional (can run without it)
    const allHealthy = dbStatus === 'ok';

    return {
      status: allHealthy ? 'ok' : 'degraded',
      stage: getAppStage(),
      checks: {
        database: dbStatus,
        redis: redisStatus,
      },
      timestamp: new Date().toISOString(),
    };
  }
}

