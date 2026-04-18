import { Module } from '@nestjs/common';
import { EligibilityModule } from '@bll/services/shared/eligibility/EligibilityModule.module';
import { ApplicationCreationService } from './ApplicationCreationService';
import { ApplicationAccessService } from './helpers/ApplicationAccessService';
import { ApplicationCreationContextService } from './helpers/ApplicationCreationContextService';
import { ApplicationMapper } from './helpers/ApplicationMapper';
import { ApplicationValidator } from './helpers/ApplicationValidator';
import { ApplicationActivityService } from './helpers/ApplicationActivityService';
import { ApplicationSerialNumberService } from './helpers/ApplicationSerialNumberService';
import { ApplicationRequirementResolver } from './helpers/ApplicationRequirementResolver';

@Module({
  imports: [EligibilityModule],
  providers: [
    ApplicationAccessService,
    ApplicationCreationContextService,
    ApplicationCreationService,
    ApplicationMapper,
    ApplicationValidator,
    ApplicationActivityService,
    ApplicationSerialNumberService,
    ApplicationRequirementResolver,
  ],
  exports: [ApplicationCreationService],
})
export class ApplicationsModule {}

