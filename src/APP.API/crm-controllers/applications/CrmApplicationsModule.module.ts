import { Module } from '@nestjs/common';
import { CrmApplicationsModule as CrmApplicationsBllModule } from '@bll/crm-services/applications/CrmApplicationsModule.module';
import { CrmApplicationDocumentsController } from './CrmApplicationDocumentsController';
import { CrmLeadApplicationsController } from './CrmLeadApplicationsController';

@Module({
  imports: [CrmApplicationsBllModule],
  controllers: [CrmLeadApplicationsController, CrmApplicationDocumentsController],
})
export class CrmApplicationsModule {}
