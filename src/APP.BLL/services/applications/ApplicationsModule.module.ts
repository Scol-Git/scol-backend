import { Module } from '@nestjs/common';
import { ApplicationCreationService } from './ApplicationCreationService';
import { ApplicationMapper } from './helpers/ApplicationMapper';
import { ApplicationValidator } from './helpers/ApplicationValidator';
import { ApplicationAccessService } from './helpers/ApplicationAccessService';
import { ApplicationActivityService } from './helpers/ApplicationActivityService';
import { ApplicationSerialNumberService } from './helpers/ApplicationSerialNumberService';
import { ApplicationRequirementResolver } from './helpers/ApplicationRequirementResolver';

@Module({
  providers: [
    ApplicationCreationService,
    ApplicationMapper,
    ApplicationValidator,
    ApplicationAccessService,
    ApplicationActivityService,
    ApplicationSerialNumberService,
    ApplicationRequirementResolver,
  ],
  exports: [ApplicationCreationService],
})
export class ApplicationsModule {}

