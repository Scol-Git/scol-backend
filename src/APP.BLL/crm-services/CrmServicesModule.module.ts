import { Module } from '@nestjs/common';
import { CrmApplicationsModule } from './applications/CrmApplicationsModule.module';
import { CrmDashboardModule } from './dashboard/CrmDashboardModule.module';
import { CrmLeadsModule } from './leads/CrmLeadsModule.module';
import { CrmSearchModule } from './search/CrmSearchModule.module';

@Module({
  imports: [
    CrmApplicationsModule,
    CrmDashboardModule,
    CrmLeadsModule,
    CrmSearchModule,
  ],
  exports: [
    CrmApplicationsModule,
    CrmDashboardModule,
    CrmLeadsModule,
    CrmSearchModule,
  ],
})
export class CrmServicesModule {}
