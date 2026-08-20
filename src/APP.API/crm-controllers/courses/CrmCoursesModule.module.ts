import { Module } from '@nestjs/common';
import { CrmCoursesModule as CrmCoursesBllModule } from '@bll/crm-services/courses/CrmCoursesModule.module';
import { CrmCoursesController } from './CrmCoursesController';

@Module({
  imports: [CrmCoursesBllModule],
  controllers: [CrmCoursesController],
})
export class CrmCoursesModule {}
