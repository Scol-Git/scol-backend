import { Module } from '@nestjs/common';
import { CrmLeadsModule } from '@bll/crm-services/leads/CrmLeadsModule.module';
import { CrmDashboardQueryService } from './CrmDashboardQueryService';
import { CrmDashboardMapper } from './mappers/CrmDashboardMapper';

@Module({
  imports: [CrmLeadsModule],
  providers: [CrmDashboardQueryService, CrmDashboardMapper],
  exports: [CrmDashboardQueryService],
})
export class CrmDashboardModule {}
