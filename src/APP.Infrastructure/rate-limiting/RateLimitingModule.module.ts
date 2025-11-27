import { Module, Global } from '@nestjs/common';
import {
  IRateLimitingStorage,
  ILogger,
  IInfrastructureConfig,
} from '@shared/tokens/injection.tokens';
import { RedisConnectionService } from '../cache/RedisConnectionService.service';
import { FallbackRateLimitingStorage } from './FallbackRateLimitingStorage.service';
import { LoggingModule } from '../logging/LoggingModule.module';
import { CacheModule } from '../cache/CacheModule.module';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import type { IInfrastructureConfig as IInfrastructureConfigInterface } from '@shared/interfaces/config/IInfrastructureConfig.interface';

/**
 * Rate Limiting Module
 *
 * **Architecture:**
 * - Redis-first implementation (distributed, production-ready)
 * - Automatic in-memory fallback when Redis is unavailable
 * - Fail-open behavior (never blocks requests on errors)
 * - Throttled logging (avoids log spam)
 *
 * **Features:**
 * - Atomic sliding window via Lua script (Redis)
 * - Thread-safe sliding window (In-Memory)
 * - No sorting overhead (append-only arrays)
 * - Limit array growth (max 10k timestamps per key)
 * - Key namespacing support via RateLimitKeyBuilder
 *
 * **Fallback Behavior:**
 * 1. Always tries Redis first (distributed rate limiting)
 * 2. On Redis unavailable: auto-switches to in-memory
 * 3. Logs warning once (throttled)
 * 4. Continues serving with in-memory rate limiting
 *
 * **Important:**
 * - In-memory fallback is per-instance (not distributed)
 * - In distributed systems, each instance has separate counters when using fallback
 * - Rate limits may be less strict when using fallback
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
        // Use FallbackRateLimitingStorage which automatically handles Redis → In-Memory fallback
        return new FallbackRateLimitingStorage(redisConnection, logger);
      },
      inject: [IInfrastructureConfig, ILogger, RedisConnectionService],
    },
  ],
  exports: [IRateLimitingStorage],
})
export class RateLimitingModule {}
