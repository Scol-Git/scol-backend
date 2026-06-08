import { Module } from '@nestjs/common';
import { LeadProfileService } from './LeadProfileService';
import { LeadCreationService } from './LeadCreationService';
import { AcademicFormValidator } from './AcademicFormValidator';
import { AcademicFormMapper } from './AcademicFormMapper';
import { SearchCacheSupportModule } from '@bll/services/search/shared/cache/SearchCacheSupportModule.module';
import { StorageModule } from '@infra/storage/StorageModule.module';

/**
 * Leads Module (BLL)
 *
 * Provides lead profile services:
 * - LeadProfileService (academic form get/put)
 * - LeadCreationService (shared lead account/profile/CRM-info creation)
 * - AcademicFormValidator
 * - AcademicFormMapper
 */
@Module({
  imports: [SearchCacheSupportModule, StorageModule],
  providers: [
    LeadProfileService,
    LeadCreationService,
    AcademicFormValidator,
    AcademicFormMapper,
  ],
  exports: [LeadProfileService, LeadCreationService],
})
export class LeadsModule {}
