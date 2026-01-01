import { Module } from '@nestjs/common';
import { AuthService } from './AuthService';
import { AuthValidationService } from './AuthValidationService';
import { OtpService } from './OtpService';
import { TokenService } from './TokenService';
import { OtpSessionCleanupService } from './OtpSessionCleanupService';
import { MappingModule } from '@bll/mappings/MappingModule.module';
import { SmsModule } from '@infra/sms/SmsModule.module';

/**
 * Auth Module (BLL)
 *
 * Provides authentication services:
 * - AuthService (main service with all operations)
 * - AuthValidationService (business rule validation)
 * - OtpService (OTP management)
 * - TokenService (JWT token management)
 * - OtpSessionCleanupService (cleanup via HTTP endpoint for serverless)
 *
 * Note: ScheduleModule removed - @Cron doesn't work in serverless (Vercel).
 * OTP cleanup is triggered via /internal/cron/otp-sessions endpoint by Vercel Cron.
 */
@Module({
  imports: [MappingModule, SmsModule],
  providers: [
    AuthService,
    AuthValidationService,
    OtpService,
    TokenService,
    OtpSessionCleanupService,
  ],
  exports: [AuthService, OtpSessionCleanupService],
})
export class AuthModule {}
