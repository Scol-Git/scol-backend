import { Module } from '@nestjs/common';
import { CrmApplicationsModule } from './applications/CrmApplicationsModule.module';

@Module({
  imports: [CrmApplicationsModule],
  exports: [CrmApplicationsModule],
})
export class CrmControllersModule {}
