import { Module } from '@nestjs/common';
import { EligibilityModule } from '@bll/services/shared/eligibility/EligibilityModule.module';
import { StorageModule } from '@infra/storage/StorageModule.module';
import { ApplicationCreationService } from './ApplicationCreationService';
import { ApplicationQueryService } from './ApplicationQueryService';
import { ApplicationDocumentService } from './ApplicationDocumentService';
import { ApplicationAccessService } from './helpers/ApplicationAccessService';
import { ApplicationCreationContextService } from './helpers/ApplicationCreationContextService';
import { ApplicationMapper } from './helpers/ApplicationMapper';
import { ApplicationValidator } from './helpers/ApplicationValidator';
import { ApplicationActivityService } from './helpers/ApplicationActivityService';
import { ApplicationSerialNumberService } from './helpers/ApplicationSerialNumberService';
import { ApplicationRequirementResolver } from './helpers/ApplicationRequirementResolver';
import { ApplicationRequirementBootstrapService } from './helpers/ApplicationRequirementBootstrapService';
import { ApplicationDocumentUploadPolicy } from './helpers/ApplicationDocumentUploadPolicy';
import { ApplicationDocumentLinker } from './helpers/ApplicationDocumentLinker';
import { ApplicationDocumentVersionSequencer } from './helpers/ApplicationDocumentVersionSequencer';
import { ApplicationDocumentStorageKeyBuilder } from './helpers/ApplicationDocumentStorageKeyBuilder';

// TODO(later phases): introduce ApplicationWorkflowService for CRM-only transitions
// (requirement/document/app status, stage changes) without expanding phases 1–6 surface area.

@Module({
  imports: [EligibilityModule, StorageModule],
  providers: [
    ApplicationAccessService,
    ApplicationCreationContextService,
    ApplicationCreationService,
    ApplicationQueryService,
    ApplicationDocumentService,
    ApplicationMapper,
    ApplicationValidator,
    ApplicationActivityService,
    ApplicationSerialNumberService,
    ApplicationRequirementResolver,
    ApplicationRequirementBootstrapService,
    ApplicationDocumentLinker,
    ApplicationDocumentVersionSequencer,
    ApplicationDocumentStorageKeyBuilder,
    ApplicationDocumentUploadPolicy,
  ],
  exports: [
    ApplicationCreationService,
    ApplicationQueryService,
    ApplicationDocumentService,
  ],
})
export class ApplicationsModule {}
