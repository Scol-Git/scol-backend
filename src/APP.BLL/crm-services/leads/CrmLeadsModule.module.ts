import { Module } from '@nestjs/common';
import { LeadsModule } from '@bll/services/leads/LeadsModule.module';
import { CrmLeadAccessService } from './helpers/CrmLeadAccessService';
import { CrmLeadValidationService } from './helpers/CrmLeadValidationService';
import { CrmLeadService } from './CrmLeadService';

@Module({
  imports: [LeadsModule],
  providers: [CrmLeadAccessService, CrmLeadValidationService, CrmLeadService],
  exports: [CrmLeadService],
})
export class CrmLeadsModule {}
