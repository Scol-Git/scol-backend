import { Module } from '@nestjs/common';
import { LeadProfileService } from './LeadProfileService';
import { AcademicFormValidator } from './AcademicFormValidator';
import { AcademicFormMapper } from './AcademicFormMapper';
import { SearchCacheSupportModule } from '@bll/services/search/shared/cache/SearchCacheSupportModule.module';

/**
 * Leads Module (BLL)
 *
 * Provides lead profile services:
 * - LeadProfileService (academic form get/put)
 * - AcademicFormValidator
 * - AcademicFormMapper
 */
@Module({
  imports: [SearchCacheSupportModule],
  providers: [LeadProfileService, AcademicFormValidator, AcademicFormMapper],
  exports: [LeadProfileService],
})
export class LeadsModule {}
