import { Module } from '@nestjs/common';
import { CourseServiceModule } from '@bll/services/CourseService/CourseServiceModule.module';
import { CoursesController } from './CoursesController.controller';

@Module({
  imports: [CourseServiceModule],
  controllers: [CoursesController],
})
export class CoursesModule {}
