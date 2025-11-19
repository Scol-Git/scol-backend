import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ICacheService, ILogger } from '@shared/tokens/injection.tokens';
import { RedisCacheService } from './RedisCacheService.service';
import { InMemoryCacheService } from './InMemoryCacheService.service';
import { LoggingModule } from '../logging/LoggingModule.module';
import type { ILogger as ILoggerInterface } from '@shared/interfaces/logging';

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
  imports: [ConfigModule, LoggingModule],
  providers: [
    {
      provide: ICacheService,
      useFactory: (
        config: ConfigService,
        logger: ILoggerInterface,
      ) => {
        const redisUrl = config.get<string>('REDIS_URL');
        
        if (redisUrl) {
          return new RedisCacheService(config, logger);
        }
        
        return new InMemoryCacheService();
      },
      inject: [ConfigService, ILogger],
    },
  ],
  exports: [ICacheService],
})
export class CacheModule {}

