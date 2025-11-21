import { Module } from '@nestjs/common';
import { HealthController } from './HealthController.controller';
import { CacheModule } from '@infra/cache/CacheModule.module';

/**
 * Health Check Feature Module
 *
 * Registers health check controller.
 * Imports CacheModule for cache health checks (non-global module).
 */
@Module({
  imports: [
    CacheModule, // Provides ICacheService for health checks
  ],
  controllers: [HealthController],
})
export class HealthCheckModule {}
