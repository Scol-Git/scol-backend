import { Module } from '@nestjs/common';

import { TypeOrmModule } from './db/typeorm/TypeOrmModule.module';
import { LoggingModule } from './logging/LoggingModule.module';
import { CacheModule } from './cache/CacheModule.module';
import { InfrastructureConfigModule } from './config/InfrastructureConfig';

// Import QueryBuilder extension methods to register them globally
import './db/extensions/QueryBuilderExtensions';

@Module({
  imports: [InfrastructureConfigModule, LoggingModule, TypeOrmModule, CacheModule],
  exports: [InfrastructureConfigModule, LoggingModule, TypeOrmModule, CacheModule],
})
export class InfrastructureModule {}
