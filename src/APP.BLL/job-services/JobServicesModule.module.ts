import { Module } from '@nestjs/common';
import { OtpJobServicesModule } from './otp/OtpJobServicesModule.module';
import { HealthJobServicesModule } from './health/HealthJobServicesModule.module';

/**
 * Aggregates all BLL services consumed exclusively by APP.JOB cron jobs.
 */
@Module({
  imports: [OtpJobServicesModule, HealthJobServicesModule],
  exports: [OtpJobServicesModule, HealthJobServicesModule],
})
export class JobServicesModule {}
