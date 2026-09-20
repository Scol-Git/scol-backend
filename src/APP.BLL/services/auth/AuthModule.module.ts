import { Module } from '@nestjs/common';
import { AuthService } from './AuthService';
import { AuthValidationService } from './AuthValidationService';
import { OtpService } from './OtpService';
import { TokenService } from './TokenService';
import { SessionService } from './SessionService';
import { LoginService } from './LoginService';
import { RegistrationService } from './RegistrationService';
import { PasswordRecoveryService } from './PasswordRecoveryService';
import { MappingModule } from '@bll/mappings/MappingModule.module';
import { LeadsModule } from '@bll/services/leads/LeadsModule.module';
import { SmsModule } from '@infra/sms/SmsModule.module';
import { RateLimitingModule } from '@infra/redis/rate-limiting/RateLimitingModule.module';

@Module({
  imports: [MappingModule, LeadsModule, SmsModule, RateLimitingModule],
  providers: [
    AuthService,
    AuthValidationService,
    OtpService,
    TokenService,
    SessionService,
    LoginService,
    RegistrationService,
    PasswordRecoveryService,
  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}
