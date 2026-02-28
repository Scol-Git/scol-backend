import { Module } from '@nestjs/common';
import { DataEntryService } from './DataEntryService';

@Module({
  providers: [DataEntryService],
  exports: [DataEntryService],
})
export class DataEntryModule {}
