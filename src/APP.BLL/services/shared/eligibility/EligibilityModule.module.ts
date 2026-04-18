import { Module } from '@nestjs/common';
import { EligibilityProfileBuilder } from './EligibilityProfileBuilder';
import { EligibilityLoader } from './EligibilityLoader';
import { CourseEligibilityService } from './CourseEligibilityService';

@Module({
  providers: [
    EligibilityProfileBuilder,
    EligibilityLoader,
    CourseEligibilityService,
  ],
  exports: [
    EligibilityProfileBuilder,
    EligibilityLoader,
    CourseEligibilityService,
  ],
})
export class EligibilityModule {}
