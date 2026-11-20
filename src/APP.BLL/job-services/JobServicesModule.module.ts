import { Module } from '@nestjs/common';
import { OtpJobServicesModule } from './otp/OtpJobServicesModule.module';
import { HealthJobServicesModule } from './health/HealthJobServicesModule.module';
import { AuthJobServicesModule } from './auth/AuthJobServicesModule.module';
import { CrmBulkImportsModule } from '@bll/crm-services/bulk-imports/CrmBulkImportsModule.module';

@Module({
  imports: [
    OtpJobServicesModule,
    HealthJobServicesModule,
    AuthJobServicesModule,
    CrmBulkImportsModule,
  ],
  exports: [
    OtpJobServicesModule,
    HealthJobServicesModule,
    AuthJobServicesModule,
    CrmBulkImportsModule,
  ],
})
export class JobServicesModule {}
