import { Module } from '@nestjs/common';
import { InfrastructureConfig } from './config/InfrastructureConfig';

import { TypeOrmDbModule } from './db/typeorm/TypeOrmDbModule.module';
import { LoggingModule } from './logging/logging.module';

@Module({
  imports: [InfrastructureConfig, LoggingModule, TypeOrmDbModule],
  exports: [InfrastructureConfig, LoggingModule, TypeOrmDbModule],
})
export class InfrastructureModule {}
