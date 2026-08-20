import { Module } from '@nestjs/common';
import { OtpSessionCleanupService } from './OtpSessionCleanupService';

@Module({
  providers: [OtpSessionCleanupService],
  exports: [OtpSessionCleanupService],
})
export class OtpJobServicesModule {}
