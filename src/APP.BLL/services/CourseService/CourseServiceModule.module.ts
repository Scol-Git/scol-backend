import { Module } from '@nestjs/common';
import { CourseService } from './CourseService';
import { CourseDetailsLeadFlagsResolver } from './CourseDetailsLeadFlagsResolver';
import { CourseDetailsMapper } from '../../mappings/course-details/CourseDetailsMapper';
import { EligibilityModule } from '@bll/services/shared/eligibility/EligibilityModule.module';

@Module({
  imports: [EligibilityModule],
  providers: [
    CourseService,
    CourseDetailsLeadFlagsResolver,
    CourseDetailsMapper,
  ],
  exports: [CourseService],
})
export class CourseServiceModule {}
