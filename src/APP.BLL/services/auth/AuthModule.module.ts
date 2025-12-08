import { Module } from '@nestjs/common';
import { AuthService } from './AuthService';
import { AuthValidationService } from './AuthValidationService';
import { OtpService } from './OtpService';
import { TokenService } from './TokenService';
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
 *
 * Imports:
 * - MappingModule (for AutoMapper)
 * - SmsModule (for ISmsService from Infrastructure layer)
 */
@Module({
  imports: [MappingModule, SmsModule],
  providers: [AuthService, AuthValidationService, OtpService, TokenService],
  exports: [AuthService],
})
export class AuthModule {}
