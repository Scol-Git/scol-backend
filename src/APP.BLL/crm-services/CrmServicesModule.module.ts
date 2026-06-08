import { Module } from '@nestjs/common';
import { CrmApplicationsModule } from './applications/CrmApplicationsModule.module';
import { CrmLeadsModule } from './leads/CrmLeadsModule.module';

@Module({
  imports: [CrmApplicationsModule, CrmLeadsModule],
  exports: [CrmApplicationsModule, CrmLeadsModule],
})
export class CrmServicesModule {}
