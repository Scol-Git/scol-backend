import { Injectable, Inject } from '@nestjs/common';
import { isDev } from '@infra/config/getAppStage';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IPasswordHasher } from '@shared/interfaces/security';
import {
  IPasswordHasher as IPasswordHasherToken,
  ISmsService as ISmsServiceToken,
  ISecurityConfig as ISecurityConfigToken,
  IJwtService as IJwtServiceToken,
  ILogger as ILoggerToken,
} from '@shared/tokens/injection.tokens';
import { IJwtService } from '@shared/interfaces/security';
import { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISmsService } from '@shared/interfaces/services/ISmsService.interface';
import { ILogger } from '@shared/interfaces/logging';
import { OtpService } from './OtpService';
import { SessionService } from './SessionService';
import { AuthResponseMapper } from '@bll/mappings/auth/AuthResponseMapper';
import { LeadProfileService } from '@bll/services/leads/LeadProfileService';
import { ForgotPasswordRequestDto } from '@shared/dtos/auth/ForgotPasswordRequestDto';
import { RegisterLeadResponseDto } from '@shared/dtos/auth/RegisterLeadResponseDto';
import { VerifyOtpRequestDto } from '@shared/dtos/auth/VerifyOtpRequestDto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import type { OtpUserPayload } from '@shared/interfaces/auth/OtpUserPayload.interface';
import { OtpPurpose } from '@entity/entities/OtpSession.entity';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { UserType } from '@shared/enums/UserType.enum';
import { InvalidCredentialsException } from '@shared/exceptions/auth/InvalidCredentialsException';
import { InvalidTokenException } from '@shared/exceptions/auth/InvalidTokenException';
import { PhoneNumberUtil } from '@shared/utils/PhoneNumberUtil';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';

@Injectable()
export class PasswordRecoveryService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(IPasswordHasherToken) private readonly hasher: IPasswordHasher,
    @Inject(IJwtServiceToken) private readonly jwt: IJwtService,
    private readonly otp: OtpService,
    @Inject(ISmsServiceToken) private readonly sms: ISmsService,
    private readonly sessionService: SessionService,
    private readonly authResponseMapper: AuthResponseMapper,
    private readonly leadProfileService: LeadProfileService,
    @Inject(ISecurityConfigToken)
    private readonly securityConfig: ISecurityConfig,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async forgotPassword(
    dto: ForgotPasswordRequestDto,
    ip: string,
  ): Promise<RegisterLeadResponseDto> {
    this.logger.LogInfo('Forgot password requested', {
      context: 'PasswordRecoveryService.forgotPassword',
      phone: PhoneNumberUtil.mask(dto.phone),
      ip,
      action: 'FORGOT_PASSWORD_START',
    });

    PhoneNumberUtil.validate(dto.phone);

    const user = await this.db.users.findOne({
      where: { phone: dto.phone },
    });

    const genericResponse: RegisterLeadResponseDto = {
      otpAccessToken: '',
      expiresIn: 300,
      message: 'OTP sent if account exists',
      retryAfter: this.securityConfig.otp.resendCooldownSeconds,
    };

    if (!user) {
      this.logger.warn('Forgot password - user not found', {
        context: 'PasswordRecoveryService.forgotPassword',
        phone: PhoneNumberUtil.mask(dto.phone),
        action: 'FORGOT_PASSWORD_USER_NOT_FOUND',
      });
      return genericResponse;
    }

    if (
      user.accountStatus === AccountStatus.Locked ||
      user.accountStatus === AccountStatus.Suspended
    ) {
      this.logger.warn('Forgot password - account not eligible', {
        context: 'PasswordRecoveryService.forgotPassword',
        userId: user.id,
        status: user.accountStatus,
        action: 'FORGOT_PASSWORD_FAILED_STATUS',
      });
      return genericResponse;
    }

    const newPasswordHash = await this.hasher.hash(dto.newPassword);
    const plainOtp = this.otp.generateOtp();
    const expiresAt = new Date(
      Date.now() + this.securityConfig.otp.ttlSeconds * 1000,
    );

    // Create/reuse the session first. ensureCanSendOtp requires an existing
    // session and is only for cooldown/resend limits + lastOtpSentAt.
    await this.otp.saveOtpSession(
      OtpPurpose.PasswordReset,
      dto.phone,
      plainOtp,
      user.id,
      expiresAt,
      { passwordHash: newPasswordHash },
    );

    await this.otp.ensureCanSendOtp(
      OtpPurpose.PasswordReset,
      dto.phone,
      user.id,
    );

    await this.sms.sendOtp(dto.phone, plainOtp);

    const otpToken = this.jwt.generateOtpToken({
      userId: user.id,
      phone: dto.phone,
      purpose: 'password_reset',
    });

    this.logger.LogInfo('Password reset OTP sent', {
      context: 'PasswordRecoveryService.forgotPassword',
      userId: user.id,
      action: 'FORGOT_PASSWORD_SUCCESS',
    });

    return {
      otpAccessToken: otpToken,
      expiresIn: this.securityConfig.otp.ttlSeconds,
      message: 'OTP sent if account exists',
      retryAfter: this.securityConfig.otp.resendCooldownSeconds,
      ...(isDev() && { devOtp: plainOtp }),
    };
  }

  async verifyPasswordResetOtp(
    dto: VerifyOtpRequestDto,
    otpUserPayload: OtpUserPayload,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    if (!otpUserPayload.userId) {
      throw new InvalidTokenException('Invalid password reset token');
    }

    const { purposeId } = await this.otp.verifyOtp(
      OtpPurpose.PasswordReset,
      otpUserPayload.phone,
      otpUserPayload.userId,
      dto.otp,
    );

    if (purposeId !== otpUserPayload.userId) {
      throw new InvalidCredentialsException();
    }

    const otpSession = await this.otp.getOtpSession(
      OtpPurpose.PasswordReset,
      otpUserPayload.phone,
      purposeId,
    );

    if (!otpSession?.passwordHash) {
      throw new InvalidCredentialsException();
    }

    const user = await this.db.users.findOne({
      where: { id: otpUserPayload.userId },
      relations: { roles: true, permissions: true },
    });

    if (!user || user.phone !== otpUserPayload.phone) {
      throw new InvalidTokenException('Phone number mismatch detected');
    }

    await this.sessionService.logoutAll(user.id, 'password_reset');

    user.passwordHash = otpSession.passwordHash;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastFailedLoginAt = undefined;
    if (user.accountStatus === AccountStatus.Locked) {
      user.accountStatus = AccountStatus.Active;
    }
    await this.db.users.save(user);

    const tokens = await this.sessionService.createSession(user, ip, userAgent);

    let profile: SysLeadProfiles | undefined;
    if (user.userType === UserType.Lead) {
      profile =
        (await this.db.leadProfiles.findOne({
          where: { userId: user.id },
        })) ?? undefined;
    }

    await this.otp.deleteOtpSession(
      otpUserPayload.phone,
      OtpPurpose.PasswordReset,
      purposeId,
    );

    const academicFormStatus =
      await this.leadProfileService.determinedAcademicFormStatus(user.id);

    return this.authResponseMapper.toAuthResponse(
      user,
      tokens,
      profile,
      academicFormStatus,
    );
  }

  async resendPasswordResetOtp(
    otpUserPayload: OtpUserPayload,
  ): Promise<{ message: string; retryAfter: number; devOtp?: string }> {
    if (!otpUserPayload.userId) {
      throw new InvalidTokenException('Token missing user ID');
    }

    await this.otp.ensureCanSendOtp(
      OtpPurpose.PasswordReset,
      otpUserPayload.phone,
      otpUserPayload.userId,
    );

    const pendingData = await this.otp.getOtpSession(
      OtpPurpose.PasswordReset,
      otpUserPayload.phone,
      otpUserPayload.userId,
    );

    if (!pendingData || pendingData.expiresAt < new Date()) {
      await this.otp.deleteOtpSession(
        otpUserPayload.phone,
        OtpPurpose.PasswordReset,
        otpUserPayload.userId,
      );
      throw new InvalidCredentialsException();
    }

    const plainOtp = this.otp.generateOtp();
    await this.otp.updateOtpInSession(
      OtpPurpose.PasswordReset,
      otpUserPayload.phone,
      otpUserPayload.userId,
      plainOtp,
    );
    await this.sms.sendOtp(otpUserPayload.phone, plainOtp);

    return {
      message: 'OTP was resent successfully',
      retryAfter: this.securityConfig.otp.resendCooldownSeconds,
      ...(isDev() && { devOtp: plainOtp }),
    };
  }
}
