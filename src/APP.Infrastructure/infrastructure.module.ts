import { Module } from '@nestjs/common';
import { InfrastructureConfig } from './config/InfrastructureConfig';

import { TypeOrmDbModule } from './db/typeorm/TypeOrmDbModule.module';

@Module({
  imports: [InfrastructureConfig, TypeOrmDbModule],
  exports: [InfrastructureConfig, TypeOrmDbModule],
})
export class InfrastructureModule {}
