import { Module } from '@nestjs/common';
import { ApplicationsModule } from '@bll/services/applications/ApplicationsModule.module';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';
import { CrmApplicationCreationService } from './CrmApplicationCreationService';
import { CrmApplicationQueryService } from './CrmApplicationQueryService';
import { CrmApplicationDocumentService } from './CrmApplicationDocumentService';
import { CrmApplicationDocumentReviewService } from './CrmApplicationDocumentReviewService';
import { CrmApplicationDocumentReviewPolicy } from './helpers/CrmApplicationDocumentReviewPolicy';

@Module({
  imports: [ApplicationsModule],
  providers: [
    CrmApplicationAccessService,
    CrmApplicationCreationService,
    CrmApplicationQueryService,
    CrmApplicationDocumentService,
    CrmApplicationDocumentReviewPolicy,
    CrmApplicationDocumentReviewService,
  ],
  exports: [
    CrmApplicationCreationService,
    CrmApplicationQueryService,
    CrmApplicationDocumentService,
    CrmApplicationDocumentReviewService,
  ],
})
export class CrmApplicationsModule {}
