import { Module } from '@nestjs/common';
import { CourseDetailsModule } from '@bll/services/course-details/CourseDetailsModule.module';
import { CoursesController } from './CoursesController.controller';

@Module({
  imports: [CourseDetailsModule],
  controllers: [CoursesController],
})
export class CoursesModule {}
