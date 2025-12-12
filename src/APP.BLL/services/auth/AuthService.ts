/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { AuthResponseMapper } from '@bll/mappings/auth/AuthResponseMapper';
import { UserResponseMapper } from '@bll/mappings/auth/UserResponseMapper';
import { RegisterLeadRequestDto } from '@shared/dtos/auth/RegisterLeadRequestDto';
import { RegisterLeadResponseDto } from '@shared/dtos/auth/RegisterLeadResponseDto';
import { VerifyOtpDto } from '@shared/dtos/auth/VerifyOtpDto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import { ForgotPasswordRequestDto } from '@shared/dtos/auth/ForgotPasswordRequestDto';
import { ResetPasswordRequestDto } from '@shared/dtos/auth/ResetPasswordRequestDto';
import { PasswordResetTokenResponseDto } from '@shared/dtos/auth/PasswordResetTokenResponseDto';

import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { TokenRefreshResponseDto } from '@shared/dtos/auth/TokenRefreshResponseDto';
import { UserDto } from '@shared/dtos/auth/UserDto';

import type { OtpUserPayload } from '@shared/interfaces/auth/OtpUserPayload.interface';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { PendingRegistration } from '@entity/entities/PendingRegistration.entity';
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
    @Inject(ILoggerToken) private readonly logger: ILogger,
    @Inject(IApplicationConfigToken)
    private readonly appConfig: IApplicationConfig,
    @Inject(ISecurityConfigToken)
    private readonly securityConfig: ISecurityConfig,
    private readonly configService: ConfigService,
  ) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'development';
  }

  // ============================================
  // WRITE OPERATIONS (Commands)
  // ============================================

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

    // Save pending registration (Redis-first with DB fallback)
    const pendingId = await this.otp.savePending(
      dto.phone,
      passwordHash,
      dto.fullName,
      expiresAt,
    );

    const plainOtp = await this.otp.generateAndStoreOtp(
      pendingId,
      dto.phone,
    );
    await this.sms.sendOtp(dto.phone, plainOtp);

    const otpToken = this.jwt.generateOtpToken({
      pendingId,
      phone: dto.phone,
      purpose: 'phone_verify',
    });

    this.logger.info('Pending registration created/updated successfully', {
      context: 'AuthService.registerLead',
      pendingId,
      phone: PhoneNumberUtil.mask(dto.phone),
      action: 'REGISTER_LEAD_SUCCESS',
    });

    return {
      otpAccessToken: otpToken,
      expiresIn: 300,
      message:
        'Registration successful. Please verify your phone with the OTP sent via SMS.',
      retryAfter: this.securityConfig.otp.resendCooldownSeconds,
      ...(this.isDevelopment && { devOtp: plainOtp }),
    };
  }

  /**
   * Verify OTP and activate account (for registration) or return password reset token (for password reset)
   */
  async verifyOtp(
    dto: VerifyOtpDto,
    otpUserPayload: OtpUserPayload,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto | PasswordResetTokenResponseDto> {
    this.logger.info('OTP verification started', {
      context: 'AuthService.verifyOtp',
      pendingId: otpUserPayload.pendingId,
      userId: otpUserPayload.userId,
      phone: PhoneNumberUtil.mask(otpUserPayload.phone),
      purpose: otpUserPayload.purpose,
      action: 'VERIFY_OTP_START',
    });

    // Verify OTP and get identifier (pendingId for registration, userId for password reset)
    const { pendingId } = await this.otp.verifyOtp(
      otpUserPayload.phone,
      dto.otp,
    );

    // Handle password reset flow
    if (otpUserPayload.purpose === 'password_reset') {
      if (!otpUserPayload.userId) {
        throw new InvalidTokenException('User ID missing from token');
      }

      // Verify the OTP was issued for this user
      if (pendingId !== otpUserPayload.userId) {
        this.logger.warn('OTP userId mismatch in password reset', {
          context: 'AuthService.verifyOtp',
          tokenUserId: otpUserPayload.userId,
          otpPendingId: pendingId,
          action: 'VERIFY_OTP_FAILED_OTP_MISMATCH',
        });
        throw new InvalidTokenException('OTP does not match user');
      }

      // Verify user exists
      const user = await this.db.users.findOne({
        where: { id: otpUserPayload.userId },
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
        throw new InvalidTokenException('Phone number mismatch');
      }

      // Generate password reset token (after OTP verification)
      const passwordResetToken = this.jwt.generateOtpToken({
        userId: user.id,
        phone: user.phone,
        purpose: 'password_reset',
      });

      this.logger.info('OTP verified successfully for password reset', {
        context: 'AuthService.verifyOtp',
        userId: user.id,
        phone: PhoneNumberUtil.mask(user.phone),
        action: 'VERIFY_OTP_PASSWORD_RESET_SUCCESS',
      });

      return {
        passwordResetToken,
        expiresIn: 300,
        message: 'OTP verified successfully. You can now reset your password.',
      };
    }

    // Handle registration flow (phone_verify)
    if (otpUserPayload.purpose === 'phone_verify') {
      if (!otpUserPayload.pendingId) {
        throw new InvalidTokenException('Pending ID missing from token');
      }

      // Get pending registration data (Redis-first with DB fallback)
      const pendingData = await this.otp.getPending(
        pendingId,
        otpUserPayload.phone,
      );

      if (!pendingData) {
        this.logger.warn('Pending registration not found or expired', {
          context: 'AuthService.verifyOtp',
          pendingId,
          phone: PhoneNumberUtil.mask(otpUserPayload.phone),
          action: 'VERIFY_OTP_FAILED_NO_PENDING',
        });
        throw new InvalidCredentialsException();
      }

      // Check if pending registration has expired
      if (pendingData.expiresAt < new Date()) {
        await this.otp.deletePending(otpUserPayload.phone, pendingId);
        this.logger.warn('Pending registration expired', {
          context: 'AuthService.verifyOtp',
          pendingId,
          phone: PhoneNumberUtil.mask(otpUserPayload.phone),
          action: 'VERIFY_OTP_FAILED_EXPIRED',
        });
        throw new InvalidCredentialsException();
      }

      // Create user and profile in a transaction
      const result = await this.db.transaction(async (manager: EntityManager) => {
        const userRepo = manager.getRepository(SysUsers);
        const profileRepo = manager.getRepository(SysLeadProfiles);

        // Race condition guard: Re-check phone uniqueness
        const existingUser = await userRepo.findOne({
          where: { phone: otpUserPayload.phone },
        });

        if (existingUser) {
          throw new PhoneAlreadyExistsException(otpUserPayload.phone);
        }

        // Create new user
        const newUser = userRepo.create({
          phone: otpUserPayload.phone,
          passwordHash: pendingData.passwordHash,
          accountStatus: AccountStatus.Active,
          userType: UserType.Lead,
          isPhoneVerified: true,
          failedLoginAttempts: 0,
        });

        const savedUser = await userRepo.save(newUser);

        // Create lead profile
        const profile = profileRepo.create({
          userId: savedUser.id,
          fullName: pendingData.fullName,
          user: savedUser,
        });

        await profileRepo.save(profile);

        // Delete pending registration from Redis and DB
        await this.otp.deletePending(otpUserPayload.phone, pendingId);

        return { user: savedUser, profile };
      });

      // Load user with relations for token generation
      const user = await this.db.users.findOne({
        where: { id: result.user.id },
        relations: { roles: true, permissions: true },
      });

      if (!user) {
        throw new InvalidCredentialsException();
      }

      const tokens = await this.token.issueTokenPair(user, ip, userAgent);

      this.logger.info('OTP verified successfully, user created', {
        context: 'AuthService.verifyOtp',
        userId: user.id,
        phone: PhoneNumberUtil.mask(user.phone),
        action: 'VERIFY_OTP_SUCCESS',
      });

      return this.authResponseMapper.toAuthResponse(user, tokens, result.profile);
    }

    // Unknown purpose
    throw new InvalidTokenException('Invalid token purpose');
  }

  /**
   * Resend OTP
   */
  async resendOtp(
    otpUserPayload: OtpUserPayload,
    ip: string,
  ): Promise<RegisterLeadResponseDto> {
    this.logger.info('OTP resend requested', {
      context: 'AuthService.resendOtp',
      pendingId: otpUserPayload.pendingId,
      phone: PhoneNumberUtil.mask(otpUserPayload.phone),
      action: 'RESEND_OTP_START',
    });

    // Validate this is for registration flow (phone_verify)
    if (otpUserPayload.purpose !== 'phone_verify') {
      throw new InvalidTokenException('Resend OTP is only available for registration flow');
    }

    if (!otpUserPayload.pendingId) {
      throw new InvalidTokenException('Pending ID missing from token');
    }

    await this.otp.canResendOtp(otpUserPayload.phone, ip);

    // Get pending registration data (Redis-first with DB fallback)
    const pendingData = await this.otp.getPending(
      otpUserPayload.pendingId,
      otpUserPayload.phone,
    );

    if (!pendingData) {
      this.logger.warn('Pending registration not found for resend', {
        context: 'AuthService.resendOtp',
        pendingId: otpUserPayload.pendingId,
        phone: PhoneNumberUtil.mask(otpUserPayload.phone),
        action: 'RESEND_OTP_FAILED_NOT_FOUND',
      });
      throw new BusinessException(
        'Registration session expired. Please register again.',
        'REGISTRATION_EXPIRED',
      );
    }

    // Check if pending registration has expired
    if (pendingData.expiresAt < new Date()) {
      await this.otp.deletePending(otpUserPayload.phone, otpUserPayload.pendingId);
      this.logger.warn('Pending registration expired on resend', {
        context: 'AuthService.resendOtp',
        pendingId: otpUserPayload.pendingId,
        phone: PhoneNumberUtil.mask(otpUserPayload.phone),
        action: 'RESEND_OTP_FAILED_EXPIRED',
      });
      throw new BusinessException(
        'Registration session expired. Please register again.',
        'REGISTRATION_EXPIRED',
      );
    }

    const plainOtp = await this.otp.generateAndStoreOtp(
      otpUserPayload.pendingId,
      otpUserPayload.phone,
    );

    await this.sms.sendOtp(otpUserPayload.phone, plainOtp);

    const otpToken = this.jwt.generateOtpToken({
      pendingId: otpUserPayload.pendingId,
      phone: otpUserPayload.phone,
      purpose: 'phone_verify',
    });

    this.logger.info('OTP resent successfully', {
      context: 'AuthService.resendOtp',
      pendingId: otpUserPayload.pendingId,
      action: 'RESEND_OTP_SUCCESS',
    });

    return {
      otpAccessToken: otpToken,
      expiresIn: 300,
      message: 'OTP resent successfully.',
      retryAfter: this.securityConfig.otp.resendCooldownSeconds,
      ...(this.isDevelopment && { devOtp: plainOtp }),
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

    return this.authResponseMapper.toAuthResponse(user, tokens, profile);
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
      relations: { user: { roles: true, permissions: true } },
    });

    if (!session) {
      this.logger.warn('Refresh token session not found', {
        context: 'AuthService.refreshAccessToken',
        userId: payload.sub,
        action: 'REFRESH_TOKEN_FAILED_NO_SESSION',
      });
      throw new InvalidTokenException('Invalid refresh token');
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
      throw new InvalidTokenException('Invalid refresh token');
    }

    if (session.expiresAt < new Date()) {
      this.logger.warn('Refresh token expired', {
        context: 'AuthService.refreshAccessToken',
        userId: payload.sub,
        sessionId: session.id,
        expiresAt: session.expiresAt,
        action: 'REFRESH_TOKEN_FAILED_EXPIRED',
      });
      throw new InvalidTokenException('Refresh token expired');
    }

    const newAccessToken = this.jwt.generateAccessToken({
      sub: session.user.id,
      orgId: '',
      email: session.user.email || session.user.phone,
      roles: session.user.roles.map((role) => role.name),
      permissions: session.user.permissions.map((perm) => perm.name),
      isSuperAdmin: false,
    });

    this.logger.info('Token refreshed successfully', {
      context: 'AuthService.refreshAccessToken',
      userId: session.user.id,
      sessionId: session.id,
      action: 'REFRESH_TOKEN_SUCCESS',
    });

    return {
      accessToken: newAccessToken
    };
  }

  /**
   * Resend OTP using credentials (phone + password) to issue a new OTP access token
   */
  async resendOtpWithCredentials(
    dto: any,
    ip?: string,
  ): Promise<RegisterLeadResponseDto> {
    throw new BusinessException(
      'Resend OTP with credentials is not supported in this build.',
      'FEATURE_DISABLED',
    );
  }

  /**
   * Logout
   */
  async logout(userId: string, sessionId?: string): Promise<void> {
    this.logger.info('Logout requested', {
      context: 'AuthService.logout',
      userId,
      sessionId,
      action: 'LOGOUT_START',
    });

    if (sessionId) {
      await this.db.userSessions.update(
        { id: sessionId, userId },
        { revokedAt: new Date() },
      );
    } else {
      const session = await this.db.userSessions.findOne({
        where: { userId, revokedAt: IsNull() },
        order: { createdAt: 'DESC' },
      });

      if (session) {
        session.revokedAt = new Date();
        await this.db.userSessions.save(session);
      }
    }

    this.logger.info('Logout successful', {
      context: 'AuthService.logout',
      userId,
      sessionId,
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

    if (!user) {
      // Don't reveal if user exists for security
      this.logger.warn('Forgot password - user not found', {
        context: 'AuthService.forgotPassword',
        phone: PhoneNumberUtil.mask(dto.phone),
        action: 'FORGOT_PASSWORD_FAILED_NOT_FOUND',
      });
      throw new InvalidCredentialsException();
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
        'Account is suspended. Please contact support.',
        'ACCOUNT_SUSPENDED',
      );
    }

    // Check rate limiting for password reset
    await this.otp.canResendOtp(dto.phone, ip);

    // Generate and store OTP (use userId as identifier for password reset)
    const plainOtp = await this.otp.generateAndStoreOtp(
      user.id, // Use userId instead of pendingId for password reset
      dto.phone,
    );

    await this.sms.sendOtp(dto.phone, plainOtp);

    // Generate password reset token
    const otpToken = this.jwt.generateOtpToken({
      userId: user.id,
      phone: dto.phone,
      purpose: 'password_reset',
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
      message:
        'OTP sent successfully. Please verify your phone to reset your password.',
      retryAfter: this.securityConfig.otp.resendCooldownSeconds,
      ...(this.isDevelopment && { devOtp: plainOtp }),
    };
  }

  /**
   * Reset Password - Update password after OTP verification
   * Requires password reset token in Authorization header (obtained after OTP verification)
   * Returns auth tokens to automatically log in the user
   */
  async resetPassword(
    dto: ResetPasswordRequestDto,
    otpUserPayload: OtpUserPayload,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    this.logger.info('Password reset requested', {
      context: 'AuthService.resetPassword',
      userId: otpUserPayload.userId,
      phone: PhoneNumberUtil.mask(otpUserPayload.phone),
      action: 'RESET_PASSWORD_START',
    });

    // Validate token purpose
    if (otpUserPayload.purpose !== 'password_reset') {
      this.logger.warn('Invalid token purpose for password reset', {
        context: 'AuthService.resetPassword',
        purpose: otpUserPayload.purpose,
        action: 'RESET_PASSWORD_FAILED_INVALID_PURPOSE',
      });
      throw new InvalidTokenException('Invalid token for password reset');
    }

    if (!otpUserPayload.userId) {
      throw new InvalidTokenException('User ID missing from token');
    }

    // Verify passwords match
    if (dto.newPassword !== dto.confirmPassword) {
      throw new ValidationException('Passwords do not match', {
        confirmPassword: ['Passwords do not match'],
      });
    }

    // Get user with relations
    const user = await this.db.users.findOne({
      where: { id: otpUserPayload.userId },
      relations: { roles: true, permissions: true },
    });

    if (!user) {
      this.logger.warn('User not found for password reset', {
        context: 'AuthService.resetPassword',
        userId: otpUserPayload.userId,
        action: 'RESET_PASSWORD_FAILED_USER_NOT_FOUND',
      });
      throw new InvalidCredentialsException();
    }

    // Verify phone matches
    if (user.phone !== otpUserPayload.phone) {
      this.logger.warn('Phone mismatch in password reset', {
        context: 'AuthService.resetPassword',
        userId: user.id,
        tokenPhone: PhoneNumberUtil.mask(otpUserPayload.phone),
        userPhone: PhoneNumberUtil.mask(user.phone),
        action: 'RESET_PASSWORD_FAILED_PHONE_MISMATCH',
      });
      throw new InvalidTokenException('Phone number mismatch');
    }

    // Hash new password
    const newPasswordHash = await this.hasher.hash(dto.newPassword);

    // Update password and reset failed login attempts
    user.passwordHash = newPasswordHash;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;

    // Auto-unlock if account was locked
    if (user.accountStatus === AccountStatus.Locked) {
      user.accountStatus = AccountStatus.Active;
    }

    await this.db.users.save(user);

    // Revoke all existing sessions for security
    await this.logoutAll(user.id);

    // Issue new token pair (creates new session)
    const tokens = await this.token.issueTokenPair(user, ip, userAgent);

    // Get profile if user is Lead
    let profile: SysLeadProfiles | undefined;
    if (user.userType === UserType.Lead) {
      profile =
        (await this.db.leadProfiles.findOne({
          where: { userId: user.id },
        })) ?? undefined;
    }

    this.logger.info('Password reset successful', {
      context: 'AuthService.resetPassword',
      userId: user.id,
      phone: PhoneNumberUtil.mask(user.phone),
      action: 'RESET_PASSWORD_SUCCESS',
    });

    return this.authResponseMapper.toAuthResponse(user, tokens, profile);
  }

  // ============================================
  // READ OPERATIONS (Queries)
  // ============================================

  /**
   * Get current user information
   */
  async getCurrentUser(userId: string): Promise<UserDto> {
    const user = await this.db.users.findOne({
      where: { id: userId },
      relations: { roles: true, permissions: true },
    });

    if (!user) {
      throw new BusinessException('User not found', 'USER_NOT_FOUND');
    }

    let profile = undefined;
    if (user.userType === UserType.Lead) {
      profile =
        (await this.db.leadProfiles.findOne({
          where: { userId: user.id },
        })) ?? undefined;
    }

    return this.userMapper.toUserDto(user, profile);
  }

  /**
   * Get user sessions
   */
  async getUserSessions(userId: string) {
    const sessions = await this.db.userSessions.find({
      where: { userId, revokedAt: null as any },
      order: { createdAt: 'DESC' },
    });

    return sessions.map((session) => ({
      id: session.id,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
    }));
  }
}
