import { Module } from '@nestjs/common';
import { StorageModule } from '@infra/storage/StorageModule.module';
import { BulkImportBatchService } from './BulkImportBatchService';
import { BulkImportProcessor } from './BulkImportProcessor';
import { BulkImportQueueRepository } from './BulkImportQueueRepository';
import { BulkImportStorageKeyBuilder } from './helpers/BulkImportStorageKeyBuilder';
import { DbPressureGuard } from './common/DbPressureGuard';
import { UniversityImportHandler } from './university/UniversityImportHandler';
import { UniversityDraftWriter } from './university/UniversityDraftWriter';
import { CourseImportHandler } from './course/CourseImportHandler';
import { CourseDraftWriter } from './course/CourseDraftWriter';

@Module({
  imports: [StorageModule],
  providers: [
    BulkImportBatchService,
    BulkImportProcessor,
    BulkImportQueueRepository,
    BulkImportStorageKeyBuilder,
    DbPressureGuard,
    UniversityImportHandler,
    CourseImportHandler,
    UniversityDraftWriter,
    CourseDraftWriter,
  ],
  exports: [BulkImportBatchService, BulkImportProcessor],
})
export class CrmBulkImportsModule {}
