import { Module, Global } from '@nestjs/common';
import {
  ICacheService,
  ILogger,
  IInfrastructureConfig,
} from '@shared/tokens/injection.tokens';
import { RedisConnectionService } from './RedisConnectionService.service';
import { FallbackCacheService } from './FallbackCacheService.service';
import { LoggingModule } from '../logging/LoggingModule.module';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import type { IInfrastructureConfig as IInfrastructureConfigInterface } from '@shared/interfaces/config/IInfrastructureConfig.interface';

/**
 * Cache Module
 *
 * **Architecture:**
 * - Redis-first implementation (distributed, production-ready)
 * - Automatic in-memory fallback when Redis is unavailable
 * - Fail-open behavior (never throws, always serves)
 * - Throttled logging (avoids log spam)
 *
 * **Features:**
 * - Thread-safe getOrSet() to prevent cache stampede
 * - Compression for Redis (gzip, > 1KB threshold)
 * - Prefix-based clearing (safer than full flush)
 * - Key namespacing support via CacheKeyBuilder
 * - Pipeline operations for bulk sets
 *
 * **Fallback Behavior:**
 * 1. Always tries Redis first
 * 2. On Redis unavailable: auto-switches to in-memory
 * 3. Logs warning once (throttled)
 * 4. Continues serving with in-memory cache
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
        // Use FallbackCacheService which automatically handles Redis → In-Memory fallback
        return new FallbackCacheService(redisConnection, logger);
      },
      inject: [IInfrastructureConfig, ILogger, RedisConnectionService],
    },
  ],
  exports: [ICacheService, RedisConnectionService],
})
export class CacheModule {}
