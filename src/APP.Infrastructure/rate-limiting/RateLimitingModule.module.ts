import { Module, Global } from '@nestjs/common';
import {
  IRateLimitingStorage,
  ILogger,
  IInfrastructureConfig,
} from '@shared/tokens/injection.tokens';
import { RedisConnectionService } from '../cache/RedisConnectionService.service';
import { RateLimitingStorage as RedisRateLimitingStorage } from './redis/RateLimitingStorage.service';
import { LoggingModule } from '../logging/LoggingModule.module';
import { CacheModule } from '../cache/CacheModule.module';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import type { IInfrastructureConfig as IInfrastructureConfigInterface } from '@shared/interfaces/config/IInfrastructureConfig.interface';

/**
 * Rate Limiting Module
 *
 * **Architecture:**
 * - Redis-only implementation (distributed, production-ready)
 * - Fail-open behavior (never blocks requests on errors)
 * - App starts even if Redis is temporarily down
 *
 * **Features:**
 * - Atomic sliding window via Lua script (Redis)
 * - No sorting overhead (append-only arrays)
 * - Limit array growth (max 10k timestamps per key)
 * - Key namespacing support via RateLimitKeyBuilder
 *
 * **Fail-Open Behavior:**
 * - If Redis is unavailable at startup: logs warning, continues
 * - If Redis fails at runtime: increment returns allow-all (count=0, remaining=limit)
 * - Never blocks application from starting or running
 *
 * **Shared Redis Connection:**
 * - Uses RedisConnectionService from CacheModule
 * - Avoids duplicate connections
 * - Improves resource usage
 *
 * **Usage:**
 * ```typescript
 * constructor(@Inject(IRateLimitingStorage) private rateLimitStorage: IRateLimitingStorage) {}
 *
 * // Increment and check limit
 * const result = await this.rateLimitStorage.increment(
 *   'myapp:prod:ratelimit:user:123:/api/organizations',
 *   60,
 *   100
 * );
 *
 * if (result.count > result.limit) {
 *   throw new TooManyRequestsException();
 * }
 * ```
 *
 * @module RateLimitingModule
 */
@Global()
@Module({
  imports: [LoggingModule, CacheModule], // Import CacheModule to access RedisConnectionService
  providers: [
    {
      provide: IRateLimitingStorage,
      useFactory: (
        config: IInfrastructureConfigInterface,
        logger: ILoggerInterface,
        redisConnection: RedisConnectionService,
      ) => {
        // Use Redis-only rate limiting storage with fail-open behavior
        return new RedisRateLimitingStorage(redisConnection, logger);
      },
      inject: [IInfrastructureConfig, ILogger, RedisConnectionService],
    },
  ],
  exports: [IRateLimitingStorage],
})
export class RateLimitingModule {}
