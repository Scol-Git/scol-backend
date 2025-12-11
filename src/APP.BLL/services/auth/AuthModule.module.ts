import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthService } from './AuthService';
import { AuthValidationService } from './AuthValidationService';
import { OtpService } from './OtpService';
import { TokenService } from './TokenService';
import { PendingCleanupService } from './PendingCleanupService';
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
 * - PendingCleanupService (cron job for cleaning expired pending registrations)
 *
 * Imports:
 * - ScheduleModule (for cron jobs)
 * - MappingModule (for AutoMapper)
 * - SmsModule (for ISmsService from Infrastructure layer)
 */
@Module({
  imports: [ScheduleModule.forRoot(), MappingModule, SmsModule],
  providers: [
    AuthService,
    AuthValidationService,
    OtpService,
    TokenService,
    PendingCleanupService,
  ],
  exports: [AuthService],
})
export class AuthModule {}
