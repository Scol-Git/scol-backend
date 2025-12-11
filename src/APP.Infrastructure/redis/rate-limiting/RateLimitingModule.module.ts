import { Module, Global } from '@nestjs/common';
import {
  IRateLimitingStorage,
  ILogger,
  IInfrastructureConfig,
} from '@shared/tokens/injection.tokens';
import { RateLimitingStorage as RedisRateLimitingStorage } from './RateLimitingStorage.service';
import { LoggingModule } from '../../logging/LoggingModule.module';
import { RedisModule } from '../RedisModule.module';
import { RedisConnectionService } from '../RedisConnectionService.service';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import type { IInfrastructureConfig as IInfrastructureConfigInterface } from '@shared/interfaces/config/IInfrastructureConfig.interface';

/**
 * Rate Limiting Module
 *
 * **Architecture:**
 * - Redis-only implementation (distributed, production-ready)
 * - Fail-open behavior (never blocks requests on errors)
 * - App starts even if Redis is temporarily down
 * - Dynamic recovery (auto-reconnects without restart)
 *
 * **Features:**
 * - Atomic sliding window via Lua script (Redis)
 * - No sorting overhead (append-only arrays)
 * - Limit array growth (max 10k timestamps per key)
 * - Key namespacing support via RateLimitKeyBuilder
 * - Automatic Redis reconnection detection
 *
 * **Fail-Open Behavior:**
 * - If Redis is unavailable at startup: logs warning, continues
 * - If Redis fails at runtime: increment returns allow-all (count=0, remaining=limit)
 * - When Redis reconnects: automatically starts using Redis again
 * - Never blocks application from starting or running
 *
 * **Dynamic Recovery:**
 * - Checks Redis availability on every operation
 * - No restart required when Redis comes back online
 * - Seamless transition between fail-open and Redis-backed modes
 * - Lua script reloads automatically on Redis restart
 *
 * **Shared Redis Connection:**
 * - Uses RedisConnectionService from RedisModule
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
  imports: [LoggingModule, RedisModule],
  providers: [
    {
      provide: IRateLimitingStorage,
      useFactory: (
        config: IInfrastructureConfigInterface,
        logger: ILoggerInterface,
        redisConnection: RedisConnectionService,
      ) => {
        // Use Redis-only rate limiting storage with fail-open behavior and dynamic recovery
        return new RedisRateLimitingStorage(redisConnection, logger);
      },
      inject: [IInfrastructureConfig, ILogger, RedisConnectionService],
    },
  ],
  exports: [IRateLimitingStorage],
})
export class RateLimitingModule {}

