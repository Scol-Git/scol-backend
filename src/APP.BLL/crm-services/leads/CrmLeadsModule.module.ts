import { Module } from '@nestjs/common';
import { ApplicationsModule } from '@bll/services/applications/ApplicationsModule.module';
import { LeadsModule } from '@bll/services/leads/LeadsModule.module';
import { CrmApplicationsModule } from '@bll/crm-services/applications/CrmApplicationsModule.module';
import { CrmLeadAccessService } from './helpers/CrmLeadAccessService';
import { CrmLeadValidationService } from './helpers/CrmLeadValidationService';
import { CrmLeadQueryService } from './CrmLeadQueryService';
import { CrmLeadService } from './CrmLeadService';
import { CrmLeadProfileService } from './CrmLeadProfileService';
import { CrmLeadDocumentReviewService } from './CrmLeadDocumentReviewService';

@Module({
  imports: [LeadsModule, ApplicationsModule, CrmApplicationsModule],
  providers: [
    CrmLeadAccessService,
    CrmLeadValidationService,
    CrmLeadService,
    CrmLeadQueryService,
    CrmLeadProfileService,
    CrmLeadDocumentReviewService,
  ],
  exports: [
    CrmLeadAccessService,
    CrmLeadService,
    CrmLeadQueryService,
    CrmLeadProfileService,
    CrmLeadDocumentReviewService,
  ],
})
export class CrmLeadsModule {}
