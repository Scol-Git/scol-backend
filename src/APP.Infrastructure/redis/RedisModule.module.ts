import { Module, Global } from '@nestjs/common';
import { LoggingModule } from '../logging/LoggingModule.module';
import { RedisConnectionService } from './RedisConnectionService.service';

/**
 * Redis Module
 *
 * Provides shared Redis connection service that can be used by:
 * - CacheModule (distributed caching)
 * - RateLimitingModule (distributed rate limiting)
 * - Any other module that needs Redis connectivity
 *
 * **Features:**
 * - Single Redis connection shared across all modules
 * - Automatic reconnection with exponential backoff
 * - Event-driven connection state tracking
 * - Fail-open behavior (app starts even if Redis is down)
 *
 * **Architecture:**
 * - Provides RedisConnectionService as @Global
 * - Manages connection lifecycle (connect/disconnect)
 * - Tracks real-time connection state via isAvailable getter
 *
 * @module RedisModule
 */
@Global()
@Module({
  imports: [LoggingModule],
  providers: [RedisConnectionService],
  exports: [RedisConnectionService],
})
export class RedisModule {}

