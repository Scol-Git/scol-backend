import { Module } from '@nestjs/common';

import { TypeOrmModule } from './db/typeorm/TypeOrmModule.module';
import { LoggingModule } from './logging/LoggingModule.module';
import { CacheModule } from './redis/cache/CacheModule.module';
import { RateLimitingModule } from './redis/rate-limiting/RateLimitingModule.module';
import { AppConfigModule } from './config/AppConfigModule.module';

// Import QueryBuilder extension methods to register them globally
import './db/extensions/QueryBuilderExtensions';

@Module({
  imports: [AppConfigModule, LoggingModule, TypeOrmModule, CacheModule, RateLimitingModule],
  exports: [AppConfigModule, LoggingModule, TypeOrmModule, CacheModule, RateLimitingModule],
})
export class InfrastructureModule {}
