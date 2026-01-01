import { Module } from '@nestjs/common';
import { HealthCheckService } from './HealthCheckService';
import { RedisModule } from '@infra/redis/RedisModule.module';

/**
 * Health Check Module (BLL)
 *
 * Provides health check services for monitoring infrastructure status.
 */
@Module({
  imports: [RedisModule],
  providers: [HealthCheckService],
  exports: [HealthCheckService],
})
export class HealthCheckModule {}
