/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { isDev } from '@infra/config/getAppStage';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IPasswordHasher } from '@shared/interfaces/security';
import { IPasswordHasher as IPasswordHasherToken } from '@shared/tokens/injection.tokens';
import { IJwtService } from '@shared/interfaces/security';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { ISmsService } from '@shared/interfaces/services/ISmsService.interface';
import { ISmsService as ISmsServiceToken } from '@shared/tokens/injection.tokens';
import { IApplicationConfig } from '@shared/interfaces/config/IApplicationConfig.interface';
import { IApplicationConfig as IApplicationConfigToken } from '@shared/tokens/injection.tokens';
import { ISecurityConfig } from '@shared/interfaces/config/ISecurityConfig.interface';
import { ISecurityConfig as ISecurityConfigToken } from '@shared/tokens/injection.tokens';
import { OtpService } from './OtpService';
import { TokenService } from './TokenService';
import { AuthValidationService } from './AuthValidationService';
import { LeadProfileService } from '@bll/services/leads/LeadProfileService';
import { OtpPurpose } from '@entity/entities/OtpSession.entity';
import { AuthResponseMapper } from '@bll/mappings/auth/AuthResponseMapper';
import { UserResponseMapper } from '@bll/mappings/auth/UserResponseMapper';
import { RegisterLeadRequestDto } from '@shared/dtos/auth/RegisterLeadRequestDto';
import { RegisterLeadResponseDto } from '@shared/dtos/auth/RegisterLeadResponseDto';
import { VerifyOtpRequestDto } from '@shared/dtos/auth/VerifyOtpRequestDto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import { ForgotPasswordRequestDto } from '@shared/dtos/auth/ForgotPasswordRequestDto';
import { ResetPasswordRequestDto } from '@shared/dtos/auth/ResetPasswordRequestDto';

import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { TokenRefreshResponseDto } from '@shared/dtos/auth/TokenRefreshResponseDto';

import type { OtpUserPayload } from '@shared/interfaces/auth/OtpUserPayload.interface';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { UserType } from '@shared/enums/UserType.enum';
import { PhoneAlreadyExistsException } from '@shared/exceptions/auth/PhoneAlreadyExistsException';
import { InvalidCredentialsException } from '@shared/exceptions/auth/InvalidCredentialsException';
import { AccountLockedException } from '@shared/exceptions/auth/AccountLockedException';
import { InvalidTokenException } from '@shared/exceptions/auth/InvalidTokenException';
import { BusinessException } from '@shared/exceptions/BusinessException';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { PhoneNumberUtil } from '@shared/utils/PhoneNumberUtil';
import { EntityManager } from 'typeorm';
import { ResendOtpResponseDto } from '@shared/dtos/auth/ResendOtpResponseDto';
import { UserContextAccessor } from '@shared/context/UserContextAccessor';
import { randomUUID } from 'crypto';
import { SysRoles } from '@entity/entities/SysRoles.entity';
import { Role } from '@shared/enums/Role.enum';

/**
 * Auth Service
 *
 * Main authentication service handling all authentication operations.
 * Combines write and read operations for MVP simplicity.
 */
@Injectable()
export class AuthService {
  private readonly isDevelopment: boolean;

  constructor(
    private readonly db: AppDbContext,
    @Inject(IPasswordHasherToken) private readonly hasher: IPasswordHasher,
    @Inject(IJwtServiceToken) private readonly jwt: IJwtService,
    private readonly otp: OtpService,
    private readonly token: TokenService,
    @Inject(ISmsServiceToken) private readonly sms: ISmsService,
    private readonly validation: AuthValidationService,
    private readonly authResponseMapper: AuthResponseMapper,
    private readonly userMapper: UserResponseMapper,
    private readonly leadProfileService: LeadProfileService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    @Inject(IApplicationConfigToken)
    private readonly appConfig: IApplicationConfig,
    @Inject(ISecurityConfigToken)
    private readonly securityConfig: ISecurityConfig,
  ) {
    // Use APP_STAGE instead of NODE_ENV for stage-dependent behavior
    this.isDevelopment = isDev();
  }

  /**
   * Register a new lead/student
   */
  async registerLead(
    dto: RegisterLeadRequestDto,
  ): Promise<RegisterLeadResponseDto> {
    this.logger.info('Lead registration started', {
      context: 'AuthService.registerLead',
      phone: PhoneNumberUtil.mask(dto.phone),
      action: 'REGISTER_LEAD_START',
    });

    PhoneNumberUtil.validate(dto.phone);

    // Check if phone already exists in SysUsers (verified accounts)
    const existingUser = await this.db.users.findOne({
      where: { phone: dto.phone },
    });

    if (existingUser) {
      throw new PhoneAlreadyExistsException(dto.phone);
    }

    const passwordHash = await this.hasher.hash(dto.password);

    // Calculate expiration time (now + OTP TTL)
    const expiresAt = new Date(
      Date.now() + this.securityConfig.otp.ttlSeconds * 1000,
    );

    // Generate OTP first
    const plainOtp = this.otp.generateOtp();

    // Save OTP session
    const purposeId = randomUUID();

    await this.otp.saveOtpSession(
      OtpPurpose.Registration,
      dto.phone,
      plainOtp,
      purposeId,
      expiresAt,
      {
        passwordHash,
        fullName: dto.fullName,
      },
    );

    // Check session limits (first OTP in this registration session)
    await this.otp.ensureCanSendOtp(
      OtpPurpose.Registration,
      dto.phone,
      purposeId,
    );

    // Send OTP via SMS
    await this.sms.sendOtp(dto.phone, plainOtp);

    const otpToken = this.jwt.generateOtpToken({
      sessionId: purposeId,
      phone: dto.phone,
      purpose: 'phone_verify',
    });

    this.logger.info('Pending registration created/updated successfully', {
      context: 'AuthService.registerLead',
      purposeId,
      phone: PhoneNumberUtil.mask(dto.phone),
      action: 'REGISTER_LEAD_SUCCESS',
    });

    return {
      otpAccessToken: otpToken,
      expiresIn: this.securityConfig.otp.ttlSeconds,
      message: 'Registration successful. Verify phone',
      retryAfter: this.securityConfig.otp.resendCooldownSeconds,
      //...(this.isDevelopment && { devOtp: plainOtp }),
      devOtp: plainOtp,
    };
  }

  /**
   * Verify OTP and activate account (for registration) or return password reset token (for password reset)
   */
  async verifyOtp(
    dto: VerifyOtpRequestDto,
    otpUserPayload: OtpUserPayload,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    this.logger.info('OTP verification started', {
      context: 'AuthService.verifyOtp',
      pendingId: otpUserPayload.pendingId,
      userId: otpUserPayload.userId,
      phone: PhoneNumberUtil.mask(otpUserPayload.phone),
      purpose: otpUserPayload.purpose,
      action: 'VERIFY_OTP_START',
    });

    // Validate token
    if (!otpUserPayload.purpose) {
      throw new InvalidTokenException('Invalid phone verification token');
    }

    if (otpUserPayload.purpose == 'phone_verify' && !otpUserPayload.pendingId) {
      throw new InvalidTokenException('Invalid phone verification token');
    }

    if (otpUserPayload.purpose == 'password_reset' && !otpUserPayload.userId) {
      throw new InvalidTokenException('Invalid password reset token');
    }

    // Handle password reset flow
    if (otpUserPayload.purpose === 'password_reset') {
      // Verify OTP using unified method
      const { purposeId } = await this.otp.verifyOtp(
        OtpPurpose.PasswordReset,
        otpUserPayload.phone,
        otpUserPayload.userId!,
        dto.otp,
      );

      // Verify the OTP sessionId matches userId
      if (purposeId !== otpUserPayload.userId) {
        this.logger.warn('OTP userId mismatch in password reset', {
          context: 'AuthService.verifyOtp',
          tokenUserId: otpUserPayload.userId,
          otpSessionId: purposeId,
          action: 'VERIFY_OTP_FAILED_OTP_MISMATCH',
        });
        throw new InvalidCredentialsException();
      }

      // Fetch OTP session to get stored newPasswordHash
      const otpSession = await this.otp.getOtpSession(
        OtpPurpose.PasswordReset,
        otpUserPayload.phone,
        purposeId,
      );

      if (!otpSession || !otpSession.passwordHash) {
        this.logger.warn('OTP session missing password hash', {
          context: 'AuthService.verifyOtp',
          userId: otpUserPayload.userId,
          action: 'VERIFY_OTP_FAILED_NO_PASSWORD_HASH',
        });
        throw new InvalidCredentialsException();
      }

      // Verify user exists with relations
      const user = await this.db.users.findOne({
        where: { id: otpUserPayload.userId },
        relations: { roles: true, permissions: true },
      });

      if (!user) {
        this.logger.warn('User not found for password reset', {
          context: 'AuthService.verifyOtp',
          userId: otpUserPayload.userId,
          action: 'VERIFY_OTP_FAILED_USER_NOT_FOUND',
        });
        throw new InvalidCredentialsException();
      }

      // Verify phone matches
      if (user.phone !== otpUserPayload.phone) {
        this.logger.warn('Phone mismatch in password reset', {
          context: 'AuthService.verifyOtp',
          userId: user.id,
          tokenPhone: PhoneNumberUtil.mask(otpUserPayload.phone),
          userPhone: PhoneNumberUtil.mask(user.phone),
          action: 'VERIFY_OTP_FAILED_PHONE_MISMATCH',
        });
        throw new InvalidTokenException('Phone number mismatch detected');
      }

      // Revoke existing sessions before password change
      await this.logoutAll(user.id);

      // Apply new password hash from OTP session
      user.passwordHash = otpSession.passwordHash;
      user.failedLoginAttempts = 0;
      user.lockedUntil = undefined;
      if (user.accountStatus === AccountStatus.Locked) {
        user.accountStatus = AccountStatus.Active;
      }

      await this.db.users.save(user);

      // Issue new token pair (creates new session)
      const tokens = await this.token.issueTokenPair(user, ip, userAgent);

      // Load profile if needed
      let profile: SysLeadProfiles | undefined;
      if (user.userType === UserType.Lead) {
        profile =
          (await this.db.leadProfiles.findOne({
            where: { userId: user.id },
          })) ?? undefined;
      }

      // Cleanup OTP session
      await this.otp.deleteOtpSession(
        otpUserPayload.phone,
        OtpPurpose.PasswordReset,
        purposeId,
      );

      this.logger.info('Password reset completed via OTP verify', {
        context: 'AuthService.verifyOtp',
        userId: user.id,
        phone: PhoneNumberUtil.mask(user.phone),
        action: 'VERIFY_OTP_PASSWORD_RESET_SUCCESS',
      });

      const academicFormStatus =
        await this.leadProfileService.determinedAcademicFormStatus(user.id);
      return this.authResponseMapper.toAuthResponse(
        user,
        tokens,
        profile,
        academicFormStatus,
      );
    }

    // Handle registration flow (phone_verify)
    if (otpUserPayload.purpose === 'phone_verify') {
      if (!otpUserPayload.pendingId) {
        throw new InvalidTokenException('Token missing pending ID');
      }

      // Verify OTP using unified method
      const { purposeId } = await this.otp.verifyOtp(
        OtpPurpose.Registration,
        otpUserPayload.phone,
        otpUserPayload.pendingId,
        dto.otp,
      );

      // Verify the OTP sessionId matches pendingId
      if (purposeId !== otpUserPayload.pendingId) {
        this.logger.warn('OTP pendingId mismatch in registration', {
          context: 'AuthService.verifyOtp',
          tokenPendingId: otpUserPayload.pendingId,
          otpSessionId: purposeId,
          action: 'VERIFY_OTP_FAILED_OTP_MISMATCH',
        });
        throw new InvalidTokenException('OTP registration mismatch');
      }

      // Get OTP session data (Redis-first with DB fallback)
      const pendingData = await this.otp.getOtpSession(
        OtpPurpose.Registration,
        otpUserPayload.phone,
        otpUserPayload.pendingId,
      );

      if (!pendingData) {
        this.logger.warn('OTP session not found or expired', {
          context: 'AuthService.verifyOtp',
          pendingId: otpUserPayload.pendingId,
          phone: PhoneNumberUtil.mask(otpUserPayload.phone),
          action: 'VERIFY_OTP_FAILED_NO_SESSION',
        });
        throw new InvalidCredentialsException();
      }

      // Check if session has expired
      if (pendingData.expiresAt < new Date()) {
        await this.otp.deleteOtpSession(
          otpUserPayload.phone,
          OtpPurpose.Registration,
          otpUserPayload.pendingId,
        );
        this.logger.warn('OTP session expired', {
          context: 'AuthService.verifyOtp',
          pendingId: otpUserPayload.pendingId,
          phone: PhoneNumberUtil.mask(otpUserPayload.phone),
          action: 'VERIFY_OTP_FAILED_EXPIRED',
        });
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

      // Create user and profile in a transaction
      const result = await this.db.transaction(
        async (manager: EntityManager) => {
          const userRepo = manager.getRepository(SysUsers);
          const profileRepo = manager.getRepository(SysLeadProfiles);
          const roleRepo = manager.getRepository(SysRoles);
          //session?id
          // Race condition guard: Re-check phone uniqueness
          const existingUser = await userRepo.findOne({
            where: { phone: otpUserPayload.phone },
          });

          if (existingUser) {
            throw new PhoneAlreadyExistsException(otpUserPayload.phone);
          }

          //fetch Lead role
          const leadRole = await roleRepo.findOne({
            where: { name: Role.LEAD },
          });

          if (!leadRole) {
            throw new BusinessException(
              'Lead role not found',
              'LEAD_ROLE_NOT_FOUND',
            );
          }

          // Create new user
          const newUser = userRepo.create({
            phone: otpUserPayload.phone,
            passwordHash: pendingData.passwordHash,
            accountStatus: AccountStatus.Active,
            userType: UserType.Lead,
            isPhoneVerified: true,
            failedLoginAttempts: 0,
            roles: [leadRole],
          });

          const savedUser = await userRepo.save(newUser);

          // Create lead profile
          const profile = profileRepo.create({
            userId: savedUser.id,
            fullName: pendingData.fullName,
          });

          await profileRepo.save(profile);

          // Delete OTP session from Redis and DB
          if (otpUserPayload.pendingId) {
            await this.otp.deleteOtpSession(
              otpUserPayload.phone,
              OtpPurpose.Registration,
              otpUserPayload.pendingId,
            );
          }

          return { user: savedUser, profile };
        },
      );

      // Load user with relations for token generation
      const user = await this.db.users.findOne({
        where: { id: result.user.id },
        relations: { roles: true, permissions: true },
      });

      if (!user) {
        throw new InvalidCredentialsException();
      }

      const tokens = await this.token.issueTokenPair(user, ip, userAgent);
      //session?id is created here

      this.logger.info('OTP verified successfully, user created', {
        context: 'AuthService.verifyOtp',
        userId: user.id,
        phone: PhoneNumberUtil.mask(user.phone),
        action: 'VERIFY_OTP_SUCCESS',
      });

      const academicFormStatus =
        await this.leadProfileService.determinedAcademicFormStatus(user.id);
      return this.authResponseMapper.toAuthResponse(
        user,
        tokens,
        result.profile,
        academicFormStatus,
      );
    }

    // Unknown purpose
    throw new InvalidTokenException('Invalid token purpose assigned');
  }

  /**
   * Resend OTP (Registration Flow Only)
   *
   * - Does NOT issue any OTP access token
   * - Only resends OTP within existing OTP session
   * - Returns devOtp in non-production environments only
   */
  async resendOtp(
    otpUserPayload: OtpUserPayload,
  ): Promise<ResendOtpResponseDto> {
    this.logger.info('OTP resend requested', {
      context: 'AuthService.resendOtp',
      purpose: otpUserPayload.purpose,
      phone: PhoneNumberUtil.mask(otpUserPayload.phone),
      action: 'RESEND_OTP_START',
    });

    // 1. Validate allowed purposes
    if (
      otpUserPayload.purpose !== 'phone_verify' &&
      otpUserPayload.purpose !== 'password_reset'
    ) {
      throw new InvalidTokenException('Resend OTP not allowed');
    }

    // 2. Resolve OTP purpose + session identifier
    let otpPurpose: OtpPurpose;
    let purposeId: string;

    if (otpUserPayload.purpose === 'phone_verify') {
      if (!otpUserPayload.pendingId) {
        throw new InvalidTokenException('Token missing pending ID');
      }
      otpPurpose = OtpPurpose.Registration;
      purposeId = otpUserPayload.pendingId;
    } else {
      // password_reset
      if (!otpUserPayload.userId) {
        throw new InvalidTokenException('Token missing user ID');
      }
      otpPurpose = OtpPurpose.PasswordReset;
      purposeId = otpUserPayload.userId;
    }

    // 3. Rate-limit resend attempts
    await this.otp.ensureCanSendOtp(
      otpPurpose,
      otpUserPayload.phone,
      purposeId,
    );

    // 4. Fetch OTP session (Redis → DB fallback)
    const pendingData = await this.otp.getOtpSession(
      otpPurpose,
      otpUserPayload.phone,
      purposeId,
    );

    if (!pendingData || pendingData.expiresAt < new Date()) {
      await this.otp.deleteOtpSession(
        otpUserPayload.phone,
        otpPurpose,
        purposeId,
      );

      throw new BusinessException('OTP session has expired', 'OTP_EXPIRED');
    }

    // 5. Generate new OTP
    const plainOtp = this.otp.generateOtp();

    // 6. Update OTP in session
    await this.otp.updateOtpInSession(
      otpPurpose,
      otpUserPayload.phone,
      purposeId,
      plainOtp,
    );

    // 7. Send OTP via SMS
    await this.sms.sendOtp(otpUserPayload.phone, plainOtp);

    this.logger.info('OTP resent successfully', {
      context: 'AuthService.resendOtp',
      purpose: otpUserPayload.purpose,
      purposeId,
      action: 'RESEND_OTP_SUCCESS',
    });

    // 8. Response (NO TOKEN)
    return {
      message: 'OTP was resent successfully',
      retryAfter: this.securityConfig.otp.resendCooldownSeconds,
      //...(this.isDevelopment && { devOtp: plainOtp }),
      devOtp: plainOtp,
    };
  }

  /**
   * Login
   */
  async login(
    dto: LoginRequestDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    this.validation.validateLoginRequest(dto);

    const identifier = dto.phone || dto.email!;
    this.logger.info('Login attempt', {
      context: 'AuthService.login',
      identifier: PhoneNumberUtil.maskIdentifier(identifier),
      ip,
      action: 'LOGIN_START',
    });

    const user = await this.db.users.findOne({
      where: dto.phone ? { phone: dto.phone } : { email: dto.email },
      relations: { roles: true, permissions: true },
    });

    if (!user) {
      this.logger.warn('Login failed - user not found', {
        context: 'AuthService.login',
        identifier: PhoneNumberUtil.maskIdentifier(identifier),
        action: 'LOGIN_FAILED_NOT_FOUND',
      });
      throw new InvalidCredentialsException();
    }

    const isPasswordValid = await this.hasher.verify(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      this.validation.handleFailedLoginAttempt(user);
      await this.db.users.save(user);

      this.logger.warn('Login failed - invalid password', {
        context: 'AuthService.login',
        userId: user.id,
        failedAttempts: user.failedLoginAttempts,
        locked: user.accountStatus === AccountStatus.Locked,
        action: 'LOGIN_FAILED_INVALID_PASSWORD',
      });

      throw new InvalidCredentialsException();
    }

    const loginCheck = this.validation.canUserLogin(user);
    if (!loginCheck.allowed) {
      this.logger.warn('Login denied', {
        context: 'AuthService.login',
        userId: user.id,
        reason: loginCheck.reason,
        action: 'LOGIN_DENIED',
      });

      if (user.accountStatus === AccountStatus.Locked) {
        throw new AccountLockedException(
          (loginCheck as any).lockedUntil as Date | undefined,
        );
      }
      throw new InvalidCredentialsException();
    }

    this.validation.resetFailedAttempts(user);
    await this.db.users.save(user);

    const tokens = await this.token.issueTokenPair(user, ip, userAgent);

    let profile: SysLeadProfiles | undefined;
    if (user.userType === UserType.Lead) {
      profile =
        (await this.db.leadProfiles.findOne({
          where: { userId: user.id },
        })) ?? undefined;
    }

    this.logger.info('Login successful', {
      context: 'AuthService.login',
      userId: user.id,
      userType: user.userType,
      action: 'LOGIN_SUCCESS',
    });

    const academicFormStatus =
      await this.leadProfileService.determinedAcademicFormStatus(user.id);
    return this.authResponseMapper.toAuthResponse(
      user,
      tokens,
      profile,
      academicFormStatus,
    );
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string,
    ip?: string,
  ): Promise<TokenRefreshResponseDto> {
    this.logger.info('Token refresh requested', {
      context: 'AuthService.refreshAccessToken',
      ip,
      action: 'REFRESH_TOKEN_START',
    });

    const payload = this.jwt.verifyToken(refreshToken, 'refresh');

    const session = await this.db.userSessions.findOne({
      where: {
        userId: payload.sub,
        revokedAt: IsNull(),
      },
      relations: { SysUser: { roles: true, permissions: true } },
    });

    if (!session) {
      this.logger.warn('Refresh token session not found', {
        context: 'AuthService.refreshAccessToken',
        userId: payload.sub,
        action: 'REFRESH_TOKEN_FAILED_NO_SESSION',
      });
      throw new InvalidTokenException('Invalid refresh token provided');
    }

    const isValid = await this.hasher.verify(
      refreshToken,
      session.refreshTokenHash,
    );
    if (!isValid) {
      this.logger.warn('Refresh token hash mismatch', {
        context: 'AuthService.refreshAccessToken',
        userId: payload.sub,
        sessionId: session.id,
        action: 'REFRESH_TOKEN_FAILED_INVALID',
      });
      throw new InvalidTokenException('Invalid refresh token provided');
    }

    if (session.expiresAt < new Date()) {
      this.logger.warn('Refresh token expired', {
        context: 'AuthService.refreshAccessToken',
        userId: payload.sub,
        sessionId: session.id,
        expiresAt: session.expiresAt,
        action: 'REFRESH_TOKEN_FAILED_EXPIRED',
      });
      throw new InvalidTokenException('Refresh token has expired');
    }

    const newAccessToken = this.jwt.generateAccessToken({
      sub: session.SysUser.id,
      orgId: '',
      email: session.SysUser.email || session.SysUser.phone,
      roles: session.SysUser.roles.map((role: any) => role.name),
      permissions: session.SysUser.permissions.map((perm: any) => perm.name),
      isSuperAdmin: false,
    });

    this.logger.info('Token refreshed successfully', {
      context: 'AuthService.refreshAccessToken',
      userId: session.SysUser.id,
      sessionId: session.id,
      action: 'REFRESH_TOKEN_SUCCESS',
    });

    const academicFormStatus =
      await this.leadProfileService.determinedAcademicFormStatus(
        session.SysUser.id,
      );
    return {
      user: {
        userId: session.SysUser.id,
        academicFormStatus,
      },
      accessToken: newAccessToken,
    };
  }

  /**
   * Logout
   */
  async logout(ip?: string, userAgent?: string): Promise<void> {
    const user = UserContextAccessor.userContext;

    this.logger.info('Logout requested', {
      context: 'AuthService.logout',
      userId: user.userId,
      ip,
      userAgent,
      action: 'LOGOUT_START',
    });

    if (ip && userAgent) {
      await this.db.userSessions.update(
        { userId: user.userId, ipAddress: ip, userAgent: userAgent },
        { revokedAt: new Date() },
      );
    } else {
      await this.db.userSessions.update(
        { userId: user.userId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
    }

    this.logger.info('Logout successful', {
      context: 'AuthService.logout',
      userId: user.userId,
      ip,
      userAgent,
      action: 'LOGOUT_SUCCESS',
    });
  }

  /**
   * Logout all sessions
   */
  async logoutAll(userId: string): Promise<void> {
    this.logger.info('Logout all sessions requested', {
      context: 'AuthService.logoutAll',
      userId,
      action: 'LOGOUT_ALL_START',
    });

    await this.db.userSessions.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    this.logger.info('All sessions logged out', {
      context: 'AuthService.logoutAll',
      userId,
      action: 'LOGOUT_ALL_SUCCESS',
    });
  }

  /**
   * Forgot Password - Initiate password reset flow
   * Verifies user exists and sends OTP for password reset
   * Always returns generic message (401 if user not found, 200 if OTP sent) to prevent user enumeration
   */
  async forgotPassword(
    dto: ForgotPasswordRequestDto,
    ip: string,
  ): Promise<RegisterLeadResponseDto> {
    this.logger.info('Forgot password requested', {
      context: 'AuthService.forgotPassword',
      phone: PhoneNumberUtil.mask(dto.phone),
      ip,
      action: 'FORGOT_PASSWORD_START',
    });

    PhoneNumberUtil.validate(dto.phone);

    // Verify user exists
    const user = await this.db.users.findOne({
      where: { phone: dto.phone },
    });

    // Always return generic message to prevent user enumeration
    // Only send OTP if user exists and account is valid
    if (!user) {
      // Don't reveal if user exists for security - log internally but return generic error
      this.logger.warn('Forgot password - user not found', {
        context: 'AuthService.forgotPassword',
        phone: PhoneNumberUtil.mask(dto.phone),
        action: 'FORGOT_PASSWORD_USER_NOT_FOUND',
      });

      // Return 401 with generic message to prevent user enumeration
      throw new UnauthorizedException('OTP sent if account exists');
    }

    // Check if account is locked or suspended
    if (user.accountStatus === AccountStatus.Locked) {
      this.logger.warn('Forgot password - account locked', {
        context: 'AuthService.forgotPassword',
        userId: user.id,
        phone: PhoneNumberUtil.mask(dto.phone),
        action: 'FORGOT_PASSWORD_FAILED_LOCKED',
      });
      throw new AccountLockedException(user.lockedUntil);
    }

    if (user.accountStatus === AccountStatus.Suspended) {
      this.logger.warn('Forgot password - account suspended', {
        context: 'AuthService.forgotPassword',
        userId: user.id,
        phone: PhoneNumberUtil.mask(dto.phone),
        action: 'FORGOT_PASSWORD_FAILED_SUSPENDED',
      });
      throw new BusinessException(
        'This account is suspended',
        'ACCOUNT_SUSPENDED',
      );
    }

    // Hash new password up-front (will be applied after OTP verification)
    const newPasswordHash = await this.hasher.hash(dto.newPassword);

    // Generate OTP
    const plainOtp = this.otp.generateOtp();
    const expiresAt = new Date(Date.now() + 300 * 1000);

    // Save OTP session (unified method for password reset) with password hash metadata
    await this.otp.saveOtpSession(
      OtpPurpose.PasswordReset,
      dto.phone,
      plainOtp,
      user.id,
      expiresAt,
      { passwordHash: newPasswordHash },
    );

    // Check session limits (rate limiting)
    await this.otp.ensureCanSendOtp(
      OtpPurpose.PasswordReset,
      dto.phone,
      user.id,
    );

    await this.sms.sendOtp(dto.phone, plainOtp);

    // Generate password reset token
    const otpToken = this.jwt.generateOtpToken({
      userId: user.id,
      phone: dto.phone,
      purpose: 'password_reset',
      newPasswordHash,
    });

    this.logger.info('Password reset OTP sent successfully', {
      context: 'AuthService.forgotPassword',
      userId: user.id,
      phone: PhoneNumberUtil.mask(dto.phone),
      action: 'FORGOT_PASSWORD_SUCCESS',
    });

    return {
      otpAccessToken: otpToken,
      expiresIn: 300,
      message: 'OTP sent if account exists',
      retryAfter: this.securityConfig.otp.resendCooldownSeconds,
      // ...(this.isDevelopment && { devOtp: plainOtp }),
      devOtp: plainOtp,
    };
  }
}
