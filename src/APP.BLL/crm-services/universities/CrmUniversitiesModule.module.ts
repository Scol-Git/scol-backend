import { Module } from '@nestjs/common';
import { CrmUniversityLookupService } from './helpers/CrmUniversityLookupService';
import { CrmUniversityValidationService } from './helpers/CrmUniversityValidationService';
import { UniStageFlowSeeder } from './helpers/UniStageFlowSeeder';
import { UniStageRequiredDocumentsResolver } from './helpers/UniStageRequiredDocumentsResolver';
import { CrmUniversityDetailsMapper } from './mappers/CrmUniversityDetailsMapper';
import { CrmUniversityStageFlowMapper } from './mappers/CrmUniversityStageFlowMapper';
import { CrmUniversityStageFlowService } from './CrmUniversityStageFlowService';
import { CrmUniversityDetailsService } from './CrmUniversityDetailsService';
import { CrmUniversityUpdateService } from './CrmUniversityUpdateService';

@Module({
  providers: [
    CrmUniversityLookupService,
    CrmUniversityValidationService,
    UniStageFlowSeeder,
    UniStageRequiredDocumentsResolver,
    CrmUniversityDetailsMapper,
    CrmUniversityStageFlowMapper,
    CrmUniversityStageFlowService,
    CrmUniversityDetailsService,
    CrmUniversityUpdateService,
  ],
  exports: [
    CrmUniversityDetailsService,
    CrmUniversityUpdateService,
    CrmUniversityStageFlowService,
  ],
})
export class CrmUniversitiesModule {}
