import { Module } from '@nestjs/common';

import { TypeOrmModule } from './db/typeorm/TypeOrmModule.module';
import { LoggingModule } from './logging/LoggingModule.module';
import { InfrastructureConfigModule } from './config/InfrastructureConfig';

@Module({
  imports: [InfrastructureConfigModule, LoggingModule, TypeOrmModule],
  exports: [InfrastructureConfigModule, LoggingModule, TypeOrmModule],
})
export class InfrastructureModule {}
