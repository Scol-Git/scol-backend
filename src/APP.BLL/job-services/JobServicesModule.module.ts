import { Module } from '@nestjs/common';
import { OtpJobServicesModule } from './otp/OtpJobServicesModule.module';
import { HealthJobServicesModule } from './health/HealthJobServicesModule.module';
import { AuthJobServicesModule } from './auth/AuthJobServicesModule.module';

@Module({
  imports: [OtpJobServicesModule, HealthJobServicesModule, AuthJobServicesModule],
  exports: [OtpJobServicesModule, HealthJobServicesModule, AuthJobServicesModule],
})
export class JobServicesModule {}
