import { Module } from '@nestjs/common';
import { CrmApplicationsModule } from './applications/CrmApplicationsModule.module';
import { CrmDashboardModule } from './dashboard/CrmDashboardModule.module';
import { CrmLeadsModule } from './leads/CrmLeadsModule.module';
import { CrmSearchModule } from './search/CrmSearchModule.module';
import { CrmCoursesModule } from './courses/CrmCoursesModule.module';
import { CrmUniversitiesModule } from './universities/CrmUniversitiesModule.module';

@Module({
  imports: [
    CrmApplicationsModule,
    CrmDashboardModule,
    CrmLeadsModule,
    CrmSearchModule,
    CrmCoursesModule,
    CrmUniversitiesModule,
  ],
  exports: [
    CrmApplicationsModule,
    CrmDashboardModule,
    CrmLeadsModule,
    CrmSearchModule,
    CrmCoursesModule,
    CrmUniversitiesModule,
  ],
})
export class CrmServicesModule {}
