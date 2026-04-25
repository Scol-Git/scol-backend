import { Module } from '@nestjs/common';
import { ApplicationsModule } from '@bll/services/applications/ApplicationsModule.module';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';
import { CrmApplicationCreationService } from './CrmApplicationCreationService';
import { CrmApplicationQueryService } from './CrmApplicationQueryService';

@Module({
  imports: [ApplicationsModule],
  providers: [
    CrmApplicationAccessService,
    CrmApplicationCreationService,
    CrmApplicationQueryService,
  ],
  exports: [CrmApplicationCreationService, CrmApplicationQueryService],
})
export class CrmApplicationsModule {}
