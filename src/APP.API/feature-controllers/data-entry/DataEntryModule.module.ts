import { Module } from '@nestjs/common';
import { DataEntryController } from './DataEntryController.controller';
import { BulkImportModule } from '@bll/services/data-entry/BulkImportModule.module';

@Module({
  imports: [BulkImportModule],
  controllers: [DataEntryController],
})
export class DataEntryModule {}
