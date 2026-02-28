import { Module } from '@nestjs/common';
import { DataEntryController } from './DataEntryController.controller';
import { DataEntryModule as DataEntryBllModule } from '@bll/services/data-entry/DataEntryModule.module';

@Module({
  imports: [DataEntryBllModule],
  controllers: [DataEntryController],
})
export class DataEntryModule {}
