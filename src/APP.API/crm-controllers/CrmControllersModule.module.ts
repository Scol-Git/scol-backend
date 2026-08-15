import { Module } from '@nestjs/common';
import { CrmApplicationsModule } from './applications/CrmApplicationsModule.module';
import { CrmLeadsModule } from './leads/CrmLeadsModule.module';
import { CrmSearchModule } from './search/CrmSearchModule.module';

@Module({
  imports: [CrmApplicationsModule, CrmLeadsModule, CrmSearchModule],
  exports: [CrmApplicationsModule, CrmLeadsModule, CrmSearchModule],
})
export class CrmControllersModule {}
