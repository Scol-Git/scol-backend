import { Module } from '@nestjs/common';
import { CourseServiceModule } from '@bll/services/CourseService/CourseServiceModule.module';
import { CrmCourseDetailsService } from './CrmCourseDetailsService';
import { CrmCourseUpdateService } from './CrmCourseUpdateService';
import { CrmCourseLookupService } from './helpers/CrmCourseLookupService';
import { CrmCourseValidationService } from './helpers/CrmCourseValidationService';

@Module({
  imports: [CourseServiceModule],
  providers: [
    CrmCourseLookupService,
    CrmCourseValidationService,
    CrmCourseDetailsService,
    CrmCourseUpdateService,
  ],
  exports: [CrmCourseDetailsService, CrmCourseUpdateService],
})
export class CrmCoursesModule {}
