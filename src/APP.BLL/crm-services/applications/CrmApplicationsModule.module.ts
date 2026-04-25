import { Module } from '@nestjs/common';
import { ApplicationsModule } from '@bll/services/applications/ApplicationsModule.module';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';
import { CrmApplicationCreationService } from './CrmApplicationCreationService';
import { CrmApplicationQueryService } from './CrmApplicationQueryService';
import { CrmApplicationDocumentService } from './CrmApplicationDocumentService';

@Module({
  imports: [ApplicationsModule],
  providers: [
    CrmApplicationAccessService,
    CrmApplicationCreationService,
    CrmApplicationQueryService,
    CrmApplicationDocumentService,
  ],
  exports: [
    CrmApplicationCreationService,
    CrmApplicationQueryService,
    CrmApplicationDocumentService,
  ],
})
export class CrmApplicationsModule {}
