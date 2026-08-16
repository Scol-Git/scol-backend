import { Module } from '@nestjs/common';
import { LeadsModule } from '@bll/services/leads/LeadsModule.module';
import { CrmLeadAccessService } from './helpers/CrmLeadAccessService';
import { CrmLeadValidationService } from './helpers/CrmLeadValidationService';
import { CrmLeadQueryService } from './CrmLeadQueryService';
import { CrmLeadService } from './CrmLeadService';

@Module({
  imports: [LeadsModule],
  providers: [
    CrmLeadAccessService,
    CrmLeadValidationService,
    CrmLeadService,
    CrmLeadQueryService,
  ],
  exports: [
    CrmLeadAccessService,
    CrmLeadService,
    CrmLeadQueryService,
  ],
})
export class CrmLeadsModule {}
