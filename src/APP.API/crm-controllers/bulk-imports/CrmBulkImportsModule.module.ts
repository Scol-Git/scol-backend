import { Module } from '@nestjs/common';
import { CrmBulkImportsModule as CrmBulkImportsBllModule } from '@bll/crm-services/bulk-imports/CrmBulkImportsModule.module';
import { CrmPublishingModule } from '@bll/crm-services/publishing/CrmPublishingModule.module';
import { CrmBulkImportsController } from './CrmBulkImportsController';

@Module({
  imports: [CrmBulkImportsBllModule, CrmPublishingModule],
  controllers: [CrmBulkImportsController],
})
export class CrmBulkImportsModule {}
