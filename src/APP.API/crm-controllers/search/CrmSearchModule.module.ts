import { Module } from '@nestjs/common';
import { CrmSearchModule as CrmSearchBllModule } from '@bll/crm-services/search/CrmSearchModule.module';
import { CrmCourseSearchController } from './CrmCourseSearchController';

@Module({
  imports: [CrmSearchBllModule],
  controllers: [CrmCourseSearchController],
})
export class CrmSearchModule {}
