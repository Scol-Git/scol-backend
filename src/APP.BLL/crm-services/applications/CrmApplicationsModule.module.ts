import { Module } from '@nestjs/common';
import { ApplicationsModule } from '@bll/services/applications/ApplicationsModule.module';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';
import { CrmApplicationCreationService } from './CrmApplicationCreationService';
import { CrmApplicationQueryService } from './CrmApplicationQueryService';
import { CrmApplicationDocumentService } from './CrmApplicationDocumentService';
import { CrmApplicationDocumentReviewService } from './CrmApplicationDocumentReviewService';
import { CrmApplicationDocumentReviewPolicy } from './helpers/CrmApplicationDocumentReviewPolicy';
import { CrmLeadScopedDocumentStatusApplier } from './helpers/CrmLeadScopedDocumentStatusApplier';
import { CrmApplicationWorkflowPolicy } from './helpers/CrmApplicationWorkflowPolicy';
import { CrmApplicationWorkflowService } from './CrmApplicationWorkflowService';
import { CrmApplicationActivityMapper } from './helpers/CrmApplicationActivityMapper';
import { CrmApplicationNoteService } from './CrmApplicationNoteService';
import { CrmApplicationNoteMapper } from './helpers/CrmApplicationNoteMapper';

@Module({
  imports: [ApplicationsModule],
  providers: [
    CrmApplicationAccessService,
    CrmApplicationCreationService,
    CrmApplicationQueryService,
    CrmApplicationActivityMapper,
    CrmApplicationNoteService,
    CrmApplicationNoteMapper,
    CrmApplicationDocumentService,
    CrmApplicationDocumentReviewPolicy,
    CrmLeadScopedDocumentStatusApplier,
    CrmApplicationDocumentReviewService,
    CrmApplicationWorkflowPolicy,
    CrmApplicationWorkflowService,
  ],
  exports: [
    CrmApplicationCreationService,
    CrmApplicationQueryService,
    CrmApplicationNoteService,
    CrmApplicationDocumentService,
    CrmApplicationDocumentReviewService,
    CrmApplicationDocumentReviewPolicy,
    CrmLeadScopedDocumentStatusApplier,
    CrmApplicationWorkflowService,
  ],
})
export class CrmApplicationsModule {}
