import { Module } from '@nestjs/common';
import { AuthService } from './AuthService';
import { AuthValidationService } from './AuthValidationService';
import { OtpService } from './OtpService';
import { TokenService } from './TokenService';
import { MappingModule } from '@bll/mappings/MappingModule.module';
import { LeadsModule } from '@bll/services/leads/LeadsModule.module';
import { SmsModule } from '@infra/sms/SmsModule.module';

/**
 * Auth Module (BLL)
 *
 * Provides authentication services:
 * - AuthService (main service with all operations)
 * - AuthValidationService (business rule validation)
 * - OtpService (OTP management)
 * - TokenService (JWT token management)
 *
 * OTP session cleanup is scheduled in APP.JOB (OtpSessionCleanupJob)
 * and implemented in APP.BLL/job-services.
 */
@Module({
  imports: [MappingModule, LeadsModule, SmsModule],
  providers: [
    AuthService,
    AuthValidationService,
    OtpService,
    TokenService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
