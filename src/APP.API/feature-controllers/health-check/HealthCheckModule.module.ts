import { Module } from '@nestjs/common';
import { HealthController } from './HealthController.controller';
import { CacheModule } from '@infra/cache/CacheModule.module';
import { GuardsModule } from '@api/common/guards/GuardsModule.module';

/**
 * Health Check Feature Module
 *
 * Registers health check controller.
 * Imports CacheModule for cache health checks and GuardsModule for rate limiting.
 */
@Module({
  imports: [
    GuardsModule, // Provides RateLimitGuard for rate limiting tests
  ],
  controllers: [HealthController],
})
export class HealthCheckModule {}
