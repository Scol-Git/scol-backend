import { Module } from '@nestjs/common';
import { StorageModule } from '@infra/storage/StorageModule.module';
import { CrmUniversityLookupService } from './helpers/CrmUniversityLookupService';
import { CrmUniversityValidationService } from './helpers/CrmUniversityValidationService';
import { UniStageFlowSeeder } from './helpers/UniStageFlowSeeder';
import { UniStageRequiredDocumentsResolver } from './helpers/UniStageRequiredDocumentsResolver';
import { CrmUniversityDetailsMapper } from './mappers/CrmUniversityDetailsMapper';
import { CrmUniversityStageFlowMapper } from './mappers/CrmUniversityStageFlowMapper';
import { CrmUniversityStageFlowService } from './CrmUniversityStageFlowService';
import { CrmUniversityDetailsService } from './CrmUniversityDetailsService';
import { CrmUniversityUpdateService } from './CrmUniversityUpdateService';
import { CrmUniversityListService } from './CrmUniversityListService';
import { CrmUniversityAssetService } from './CrmUniversityAssetService';
import { CrmUniversityIntakeFeesService } from './CrmUniversityIntakeFeesService';

@Module({
  imports: [StorageModule],
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
    CrmUniversityListService,
    CrmUniversityAssetService,
    CrmUniversityIntakeFeesService,
  ],
  exports: [
    CrmUniversityDetailsService,
    CrmUniversityUpdateService,
    CrmUniversityStageFlowService,
    CrmUniversityListService,
    CrmUniversityAssetService,
    CrmUniversityIntakeFeesService,
  ],
})
export class CrmUniversitiesModule {}
