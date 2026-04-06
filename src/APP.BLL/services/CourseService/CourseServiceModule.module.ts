import { Module } from '@nestjs/common';
import { CourseService } from './CourseService';
import { CourseDetailsMapper } from '../../mappings/course-details/CourseDetailsMapper';

@Module({
  providers: [CourseService, CourseDetailsMapper],
  exports: [CourseService],
})
export class CourseServiceModule {}
