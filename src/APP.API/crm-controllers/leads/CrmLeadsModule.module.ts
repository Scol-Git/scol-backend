import { Module } from '@nestjs/common';
import { CrmLeadsModule as CrmLeadsBllModule } from '@bll/crm-services/leads/CrmLeadsModule.module';
import { CrmLeadsController } from './CrmLeadsController';

@Module({
  imports: [CrmLeadsBllModule],
  controllers: [CrmLeadsController],
})
export class CrmLeadsModule {}
