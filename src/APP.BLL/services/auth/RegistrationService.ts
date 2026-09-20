import { Injectable, Inject } from '@nestjs/common';
import { isDev } from '@infra/config/getAppStage';
import { IPasswordHasher } from '@shared/interfaces/security';
import {
  IPasswordHasher as IPasswordHasherToken,
  ISmsService as ISmsServiceToken,
  ISecurityConfig as ISecurityConfigToken,
  ILogger as ILoggerToken,
} from '@shared/tokens/injection.tokens';
import { IJwtService } from '@shared/interfaces/security';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';
import { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISmsService } from '@shared/interfaces/services/ISmsService.interface';
import { ILogger } from '@shared/interfaces/logging';
import { OtpService } from './OtpService';
import { SessionService } from './SessionService';
import { AuthResponseMapper } from '@bll/mappings/auth/AuthResponseMapper';
import { LeadProfileService } from '@bll/services/leads/LeadProfileService';
import { LeadCreationService } from '@bll/services/leads/LeadCreationService';
import { RegisterLeadRequestDto } from '@shared/dtos/auth/RegisterLeadRequestDto';
import { RegisterLeadResponseDto } from '@shared/dtos/auth/RegisterLeadResponseDto';
import { VerifyOtpRequestDto } from '@shared/dtos/auth/VerifyOtpRequestDto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { ResendOtpResponseDto } from '@shared/dtos/auth/ResendOtpResponseDto';
import type { OtpUserPayload } from '@shared/interfaces/auth/OtpUserPayload.interface';
import { OtpPurpose } from '@entity/entities/OtpSession.entity';
import { RegisterSource } from '@shared/enums/crm/RegisterSource.enum';
import { LeadStatus } from '@shared/enums/crm/LeadStatus.enum';
import { PhoneAlreadyExistsException } from '@shared/exceptions/auth/PhoneAlreadyExistsException';
import { InvalidCredentialsException } from '@shared/exceptions/auth/InvalidCredentialsException';
import { InvalidTokenException } from '@shared/exceptions/auth/InvalidTokenException';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { PhoneNumberUtil } from '@shared/utils/PhoneNumberUtil';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { randomUUID } from 'crypto';

@Injectable()
export class RegistrationService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(IPasswordHasherToken) private readonly hasher: IPasswordHasher,
    @Inject(IJwtServiceToken) private readonly jwt: IJwtService,
    private readonly otp: OtpService,
    @Inject(ISmsServiceToken) private readonly sms: ISmsService,
    private readonly sessionService: SessionService,
    private readonly authResponseMapper: AuthResponseMapper,
    private readonly leadProfileService: LeadProfileService,
    private readonly leadCreationService: LeadCreationService,
    @Inject(ISecurityConfigToken)
    private readonly securityConfig: ISecurityConfig,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async registerLead(
    dto: RegisterLeadRequestDto,
  ): Promise<RegisterLeadResponseDto> {
    this.logger.LogInfo('Lead registration started', {
      context: 'RegistrationService.registerLead',
      phone: PhoneNumberUtil.mask(dto.phone),
      action: 'REGISTER_LEAD_START',
    });

    PhoneNumberUtil.validate(dto.phone);

    const existingUser = await this.db.users.findOne({
      where: { phone: dto.phone },
    });
    if (existingUser) {
      throw new PhoneAlreadyExistsException(dto.phone);
    }

    const passwordHash = await this.hasher.hash(dto.password);
    const expiresAt = new Date(
      Date.now() + this.securityConfig.otp.ttlSeconds * 1000,
    );
    const plainOtp = this.otp.generateOtp();
    const purposeId = randomUUID();

    await this.otp.saveOtpSession(
      OtpPurpose.Registration,
      dto.phone,
      plainOtp,
      purposeId,
      expiresAt,
      { passwordHash, fullName: dto.fullName },
    );

    await this.otp.ensureCanSendOtp(
      OtpPurpose.Registration,
      dto.phone,
      purposeId,
    );

    await this.sms.sendOtp(dto.phone, plainOtp);

    const otpToken = this.jwt.generateOtpToken({
      sessionId: purposeId,
      phone: dto.phone,
      purpose: 'phone_verify',
    });

    this.logger.LogInfo('Pending registration created successfully', {
      context: 'RegistrationService.registerLead',
      purposeId,
      phone: PhoneNumberUtil.mask(dto.phone),
      action: 'REGISTER_LEAD_SUCCESS',
    });

    return {
      otpAccessToken: otpToken,
      expiresIn: this.securityConfig.otp.ttlSeconds,
      message: 'Registration successful. Verify phone',
      retryAfter: this.securityConfig.otp.resendCooldownSeconds,
      ...(isDev() && { devOtp: plainOtp }),
    };
  }

  async verifyRegistrationOtp(
    dto: VerifyOtpRequestDto,
    otpUserPayload: OtpUserPayload,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    if (!otpUserPayload.pendingId) {
      throw new InvalidTokenException('Token missing pending ID');
    }

    const { purposeId } = await this.otp.verifyOtp(
      OtpPurpose.Registration,
      otpUserPayload.phone,
      otpUserPayload.pendingId,
      dto.otp,
    );

    if (purposeId !== otpUserPayload.pendingId) {
      throw new InvalidTokenException('OTP registration mismatch');
    }

    const pendingData = await this.otp.getOtpSession(
      OtpPurpose.Registration,
      otpUserPayload.phone,
      otpUserPayload.pendingId,
    );

    if (!pendingData) {
      throw new InvalidCredentialsException();
    }

    if (pendingData.expiresAt < new Date()) {
      await this.otp.deleteOtpSession(
        otpUserPayload.phone,
        OtpPurpose.Registration,
        otpUserPayload.pendingId,
      );
      throw new InvalidCredentialsException();
    }

    if (!pendingData.passwordHash || !pendingData.fullName) {
      throw new ValidationException(
        'Registration data is invalid',
        {
          email: ['Email is invalid'],
          password: ['Password must be at least 8 characters'],
        },
        'INVALID_REGISTRATION_DATA',
      );
    }

    const result = await this.leadCreationService.createLeadAccount({
      phone: otpUserPayload.phone,
      passwordHash: pendingData.passwordHash,
      fullName: pendingData.fullName,
      isPhoneVerified: true,
      crmInfo: {
        registerSource: RegisterSource.LoggedIn,
        registerDate: new Date(),
        leadStatus: LeadStatus.NewLead,
      },
    });

    await this.otp.deleteOtpSession(
      otpUserPayload.phone,
      OtpPurpose.Registration,
      otpUserPayload.pendingId,
    );

    const user = await this.db.users.findOne({
      where: { id: result.user.id },
      relations: { roles: true, permissions: true },
    });
    if (!user) {
      throw new InvalidCredentialsException();
    }

    const tokens = await this.sessionService.createSession(user, ip, userAgent);
    const academicFormStatus =
      await this.leadProfileService.determinedAcademicFormStatus(user.id);

    return this.authResponseMapper.toAuthResponse(
      user,
      tokens,
      result.profile,
      academicFormStatus,
    );
  }

  async resendOtp(
    otpUserPayload: OtpUserPayload,
  ): Promise<ResendOtpResponseDto> {
    if (otpUserPayload.purpose !== 'phone_verify') {
      throw new InvalidTokenException('Resend OTP not allowed');
    }
    if (!otpUserPayload.pendingId) {
      throw new InvalidTokenException('Token missing pending ID');
    }

    const purposeId = otpUserPayload.pendingId;
    await this.otp.ensureCanSendOtp(
      OtpPurpose.Registration,
      otpUserPayload.phone,
      purposeId,
    );

    const pendingData = await this.otp.getOtpSession(
      OtpPurpose.Registration,
      otpUserPayload.phone,
      purposeId,
    );

    if (!pendingData || pendingData.expiresAt < new Date()) {
      await this.otp.deleteOtpSession(
        otpUserPayload.phone,
        OtpPurpose.Registration,
        purposeId,
      );
      throw new InvalidCredentialsException();
    }

    const plainOtp = this.otp.generateOtp();
    await this.otp.updateOtpInSession(
      OtpPurpose.Registration,
      otpUserPayload.phone,
      purposeId,
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
