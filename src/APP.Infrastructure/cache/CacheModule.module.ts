import { Module, Global } from '@nestjs/common';
import { ICacheService, ILogger, IInfrastructureConfig } from '@shared/tokens/injection.tokens';
import { RedisCacheService } from './RedisCacheService.service';
import { InMemoryCacheService } from './InMemoryCacheService.service';
import { LoggingModule } from '../logging/LoggingModule.module';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';
import type { IInfrastructureConfig as IInfrastructureConfigInterface } from '@shared/interfaces/config/IInfrastructureConfig.interface';

/**
 * Cache Module
 * 
 * Provides caching services (Redis for production, In-Memory for development).
 * Automatically selects Redis if REDIS_URL is configured, otherwise falls back to in-memory.
 * 
 * @module CacheModule
 */
@Global()
@Module({
  imports: [LoggingModule],
  providers: [
    {
      provide: ICacheService,
      useFactory: (
        config: IInfrastructureConfigInterface,
        logger: ILoggerInterface,
      ) => {
        const redisUrl = config.cache.redisUrl;
        
        if (redisUrl) {
          return new RedisCacheService(config, logger);
        }
        
        return new InMemoryCacheService();
      },
      inject: [IInfrastructureConfig, ILogger],
    },
  ],
  exports: [ICacheService],
})
export class CacheModule {}

