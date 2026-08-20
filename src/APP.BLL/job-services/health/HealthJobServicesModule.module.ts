import { Module } from '@nestjs/common';
import { DatabasePingService } from './DatabasePingService';

@Module({
  providers: [DatabasePingService],
  exports: [DatabasePingService],
})
export class HealthJobServicesModule {}
