import { Module } from '@nestjs/common';
import { ApplicationsModule } from '@bll/services/applications/ApplicationsModule.module';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';
import { CrmApplicationCreationService } from './CrmApplicationCreationService';
import { CrmApplicationQueryService } from './CrmApplicationQueryService';
import { CrmApplicationDocumentService } from './CrmApplicationDocumentService';
import { CrmApplicationDocumentReviewService } from './CrmApplicationDocumentReviewService';
import { CrmApplicationDocumentReviewPolicy } from './helpers/CrmApplicationDocumentReviewPolicy';
import { CrmApplicationWorkflowPolicy } from './helpers/CrmApplicationWorkflowPolicy';
import { CrmApplicationWorkflowService } from './CrmApplicationWorkflowService';

@Module({
  imports: [ApplicationsModule],
  providers: [
    CrmApplicationAccessService,
    CrmApplicationCreationService,
    CrmApplicationQueryService,
    CrmApplicationDocumentService,
    CrmApplicationDocumentReviewPolicy,
    CrmApplicationDocumentReviewService,
    CrmApplicationWorkflowPolicy,
    CrmApplicationWorkflowService,
  ],
  exports: [
    CrmApplicationCreationService,
    CrmApplicationQueryService,
    CrmApplicationDocumentService,
    CrmApplicationDocumentReviewService,
    CrmApplicationWorkflowService,
  ],
})
export class CrmApplicationsModule {}
