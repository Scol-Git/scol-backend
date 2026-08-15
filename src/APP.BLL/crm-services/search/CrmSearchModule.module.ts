import { Module } from '@nestjs/common';
import { SearchModule } from '@bll/services/search/SearchModule.module';
import { CrmCourseSearchService } from './CrmCourseSearchService';

@Module({
  imports: [SearchModule],
  providers: [CrmCourseSearchService],
  exports: [CrmCourseSearchService],
})
export class CrmSearchModule {}
