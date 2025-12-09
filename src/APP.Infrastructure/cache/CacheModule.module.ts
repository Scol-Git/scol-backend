import { Module, Global } from '@nestjs/common';
import {
  ICacheService,
  ILogger,
  IInfrastructureConfig,
} from '@shared/tokens/injection.tokens';
import { RedisConnectionService } from './RedisConnectionService.service';
import { CacheService as RedisCacheService } from './redis/CacheService.service';
import { LoggingModule } from '../logging/LoggingModule.module';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import type { IInfrastructureConfig as IInfrastructureConfigInterface } from '@shared/interfaces/config/IInfrastructureConfig.interface';

/**
 * Cache Module
 *
 * **Architecture:**
 * - Redis-only implementation (distributed, production-ready)
 * - Fail-open behavior (never throws, always serves)
 * - App starts even if Redis is temporarily down
 *
 * **Features:**
 * - Thread-safe getOrSet() to prevent cache stampede
 * - Compression for Redis (gzip, > 1KB threshold)
 * - Prefix-based clearing (safer than full flush)
 * - Key namespacing support via CacheKeyBuilder
 * - Pipeline operations for bulk sets
 *
 * **Fail-Open Behavior:**
 * - If Redis is unavailable at startup: logs warning, continues
 * - If Redis fails at runtime: cache.get returns null, cache.set no-op, cache.getOrSet executes factory
 * - Never blocks application from starting or running
 *
 * **Usage:**
 * ```typescript
 * constructor(@Inject(ICacheService) private cache: ICacheService) {}
 *
 * // Get or set with thread-safe lock
 * const user = await this.cache.getOrSet(
 *   'user:123',
 *   async () => await this.userRepo.findById('123'),
 *   3600
 * );
 *
 * // Clear by prefix
 * await this.cache.clearByPrefix('user:');
 * ```
 *
 * @module CacheModule
 */
@Global()
@Module({
  imports: [LoggingModule],
  providers: [
    // Provide RedisConnectionService first so it can be injected by implementations
    RedisConnectionService,
    {
      provide: ICacheService,
      useFactory: (
        config: IInfrastructureConfigInterface,
        logger: ILoggerInterface,
        redisConnection: RedisConnectionService,
      ) => {
        // Use Redis-only cache service with fail-open behavior
        return new RedisCacheService(redisConnection, logger);
      },
      inject: [IInfrastructureConfig, ILogger, RedisConnectionService],
    },
  ],
  exports: [ICacheService, RedisConnectionService],
})
export class CacheModule {}
