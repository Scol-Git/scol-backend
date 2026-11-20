import { Module } from '@nestjs/common';
import { CrmCoursesModule as CrmCoursesBllModule } from '@bll/crm-services/courses/CrmCoursesModule.module';
import { CrmPublishingModule } from '@bll/crm-services/publishing/CrmPublishingModule.module';
import { CrmCoursesController } from './CrmCoursesController';

@Module({
  imports: [CrmCoursesBllModule, CrmPublishingModule],
  controllers: [CrmCoursesController],
})
export class CrmCoursesModule {}
