import { Module } from '@nestjs/common';

import { TypeOrmModule } from './db/typeorm/TypeOrmModule.module';
import { LoggingModule } from './logging/LoggingModule.module';
import { CacheModule } from './cache/CacheModule.module';
import { AppConfigModule } from './config/AppConfigModule.module';

// Import QueryBuilder extension methods to register them globally
import './db/extensions/QueryBuilderExtensions';

@Module({
  imports: [AppConfigModule, LoggingModule, TypeOrmModule, CacheModule],
  exports: [AppConfigModule, LoggingModule, TypeOrmModule, CacheModule],
})
export class InfrastructureModule {}
