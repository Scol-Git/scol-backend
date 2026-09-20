import { Injectable, Inject } from '@nestjs/common';
import { LoginService } from './LoginService';
import { RegistrationService } from './RegistrationService';
import { PasswordRecoveryService } from './PasswordRecoveryService';
import { SessionService } from './SessionService';
import { RegisterLeadRequestDto } from '@shared/dtos/auth/RegisterLeadRequestDto';
import { RegisterLeadResponseDto } from '@shared/dtos/auth/RegisterLeadResponseDto';
import { VerifyOtpRequestDto } from '@shared/dtos/auth/VerifyOtpRequestDto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import { ForgotPasswordRequestDto } from '@shared/dtos/auth/ForgotPasswordRequestDto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { TokenRefreshResponseDto } from '@shared/dtos/auth/TokenRefreshResponseDto';
import { ResendOtpResponseDto } from '@shared/dtos/auth/ResendOtpResponseDto';
import type { OtpUserPayload } from '@shared/interfaces/auth/OtpUserPayload.interface';
import { InvalidTokenException } from '@shared/exceptions/auth/InvalidTokenException';
import { UserContextAccessor } from '@shared/context/UserContextAccessor';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/**
 * Auth Service - thin façade delegating to focused auth services.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly loginService: LoginService,
    private readonly registrationService: RegistrationService,
    private readonly passwordRecoveryService: PasswordRecoveryService,
    private readonly sessionService: SessionService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  registerLead(dto: RegisterLeadRequestDto): Promise<RegisterLeadResponseDto> {
    return this.registrationService.registerLead(dto);
  }

  async verifyOtp(
    dto: VerifyOtpRequestDto,
    otpUserPayload: OtpUserPayload,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    if (!otpUserPayload.purpose) {
      throw new InvalidTokenException('Invalid phone verification token');
    }

    if (otpUserPayload.purpose === 'password_reset') {
      return this.passwordRecoveryService.verifyPasswordResetOtp(
        dto,
        otpUserPayload,
        ip,
        userAgent,
      );
    }

    if (otpUserPayload.purpose === 'phone_verify') {
      return this.registrationService.verifyRegistrationOtp(
        dto,
        otpUserPayload,
        ip,
        userAgent,
      );
    }

    throw new InvalidTokenException('Invalid token purpose assigned');
  }

  async resendOtp(
    otpUserPayload: OtpUserPayload,
  ): Promise<ResendOtpResponseDto> {
    if (otpUserPayload.purpose === 'phone_verify') {
      return this.registrationService.resendOtp(otpUserPayload);
    }
    if (otpUserPayload.purpose === 'password_reset') {
      const result =
        await this.passwordRecoveryService.resendPasswordResetOtp(
          otpUserPayload,
        );
      return {
        message: result.message,
        retryAfter: result.retryAfter,
        ...(result.devOtp && { devOtp: result.devOtp }),
      };
    }
    throw new InvalidTokenException('Resend OTP not allowed');
  }

  login(
    dto: LoginRequestDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    return this.loginService.login(dto, ip, userAgent);
  }

  refreshAccessToken(
    refreshToken: string,
    ip?: string,
  ): Promise<TokenRefreshResponseDto> {
    this.logger.LogInfo('Token refresh requested', {
      context: 'AuthService.refreshAccessToken',
      ip,
      action: 'REFRESH_TOKEN_START',
    });
    return this.sessionService.refreshAccessToken(refreshToken);
  }

  async logout(ip?: string, userAgent?: string): Promise<void> {
    const user = UserContextAccessor.userContext;
    this.logger.LogInfo('Logout requested', {
      context: 'AuthService.logout',
      userId: user.userId,
      sessionId: user.sessionId,
      ip,
      userAgent,
      action: 'LOGOUT_START',
    });
    await this.sessionService.logoutCurrentSession(user.sessionId, user.userId);
    this.logger.LogInfo('Logout successful', {
      context: 'AuthService.logout',
      userId: user.userId,
      action: 'LOGOUT_SUCCESS',
    });
  }

  logoutAll(userId: string): Promise<void> {
    return this.sessionService.logoutAll(userId);
  }

  forgotPassword(
    dto: ForgotPasswordRequestDto,
    ip: string,
  ): Promise<RegisterLeadResponseDto> {
    return this.passwordRecoveryService.forgotPassword(dto, ip);
  }
}
