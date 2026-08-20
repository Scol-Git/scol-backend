import { Module } from '@nestjs/common';
import { CourseService } from './CourseService';
import { CourseDetailsLeadFlagsResolver } from './CourseDetailsLeadFlagsResolver';
import { CourseDetailsLoader } from './CourseDetailsLoader';
import { CourseDetailsMapper } from '../../mappings/course-details/CourseDetailsMapper';
import { EligibilityModule } from '@bll/services/shared/eligibility/EligibilityModule.module';

@Module({
  imports: [EligibilityModule],
  providers: [
    CourseService,
    CourseDetailsLoader,
    CourseDetailsLeadFlagsResolver,
    CourseDetailsMapper,
  ],
  exports: [CourseService, CourseDetailsLoader, CourseDetailsMapper],
})
export class CourseServiceModule {}
