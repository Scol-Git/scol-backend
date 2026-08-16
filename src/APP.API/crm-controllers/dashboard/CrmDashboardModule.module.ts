import { Module } from '@nestjs/common';
import { CrmDashboardModule as CrmDashboardBllModule } from '@bll/crm-services/dashboard/CrmDashboardModule.module';
import { CrmDashboardController } from './CrmDashboardController';

@Module({
  imports: [CrmDashboardBllModule],
  controllers: [CrmDashboardController],
})
export class CrmDashboardModule {}
