import { Module } from '@nestjs/common';
import { LeadProfileService } from './LeadProfileService';
import { AcademicFormValidator } from './AcademicFormValidator';
import { AcademicFormMapper } from './AcademicFormMapper';

/**
 * Leads Module (BLL)
 *
 * Provides lead profile services:
 * - LeadProfileService (academic form get/put)
 * - AcademicFormValidator
 * - AcademicFormMapper
 */
@Module({
  providers: [LeadProfileService, AcademicFormValidator, AcademicFormMapper],
  exports: [LeadProfileService],
})
export class LeadsModule {}
