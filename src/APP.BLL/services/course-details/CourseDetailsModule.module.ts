import { Module } from '@nestjs/common';
import { CourseDetailsService } from './CourseDetailsService';
import { CourseDetailsMapper } from '../../mappings/course-details/CourseDetailsMapper';

@Module({
  providers: [CourseDetailsService, CourseDetailsMapper],
  exports: [CourseDetailsService],
})
export class CourseDetailsModule {}
