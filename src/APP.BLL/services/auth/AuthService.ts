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
import { OtpService } from './OtpService';
import { TokenService } from './TokenService';
import { AuthValidationService } from './AuthValidationService';
import { AuthResponseMapper } from '@bll/mappings/auth/AuthResponseMapper';
import { UserResponseMapper } from '@bll/mappings/auth/UserResponseMapper';
import { RegisterLeadRequestDto } from '@shared/dtos/auth/RegisterLeadRequestDto';
import { RegisterLeadResponseDto } from '@shared/dtos/auth/RegisterLeadResponseDto';
import { VerifyOtpDto } from '@shared/dtos/auth/VerifyOtpDto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import { ResendOtpCredentialsDto } from '@shared/dtos/auth/ResendOtpCredentialsDto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { TokenRefreshResponseDto } from '@shared/dtos/auth/TokenRefreshResponseDto';
import { UserDto } from '@shared/dtos/auth/UserDto';
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

    const existingUser = await this.db.users.findOne({
      where: { phone: dto.phone },
    });

    if (existingUser) {
      throw new PhoneAlreadyExistsException(dto.phone);
    }

    const passwordHash = await this.hasher.hash(dto.password);

    // const user = await this.db.transaction(async (manager: EntityManager) => {
    //   const userRepo = manager.getRepository(SysUsers);
    //   const profileRepo = manager.getRepository(SysLeadProfiles);

    //   const newUser = userRepo.create({
    //     phone: dto.phone,
    //     passwordHash,
    //     accountStatus: AccountStatus.NotValid,
    //     userType: UserType.Lead,
    //     isPhoneVerified: false,
    //     failedLoginAttempts: 0,
    //     roles: [],
    //     permissions: [],
    //     sessions: [],
    //   });

    //   const savedUser = await userRepo.save(newUser);

    //   const profile = profileRepo.create({
    //     userId: savedUser.id,
    //     fullName: dto.fullName,
    //     user: savedUser,
    //   });

    //   await profileRepo.save(profile);

    //   return savedUser;
    // });

    const newUser = this.db.users.create({
      phone: dto.phone,
      passwordHash,
      accountStatus: AccountStatus.NotValid,
      userType: UserType.Lead,
      isPhoneVerified: false,
      failedLoginAttempts: 0,
    });

    const newLeadProfile = this.db.leadProfiles.create({
      userId: newUser.id
    });

    newUser.leadProfile = newLeadProfile;
    newLeadProfile.user = newUser;

    await this.db.users.save(newUser);
    await this.db.leadProfiles.save(newLeadProfile);

    const plainOtp = await this.otp.generateAndStoreOtp(
      newUser.id,
      newUser.phone,
    );
    await this.sms.sendOtp(newUser.phone, plainOtp);

    const otpToken = this.jwt.generateOtpToken({
      userId: newUser.id,
      phone: newUser.phone,
      purpose: 'phone_verify',
    });

    this.logger.info('Lead registered successfully', {
      context: 'AuthService.registerLead',
      userId: newUser.id,
      phone: PhoneNumberUtil.mask(newUser.phone),
      action: 'REGISTER_LEAD_SUCCESS',
    });

    return {
      otpAccessToken: otpToken,
      expiresIn: 300,
      message:
        'Registration successful. Please verify your phone with the OTP sent via SMS.',
      ...(this.isDevelopment && { devOtp: plainOtp }),
    };
  }

  /**
   * Verify OTP and activate account
   */
  async verifyOtp(
    dto: VerifyOtpDto,
    otpUserPayload: OtpUserPayload,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    this.logger.info('OTP verification started', {
      context: 'AuthService.verifyOtp',
      userId: otpUserPayload.userId,
      phone: PhoneNumberUtil.mask(otpUserPayload.phone),
      action: 'VERIFY_OTP_START',
    });

    const { userId } = await this.otp.verifyOtp(otpUserPayload.phone, dto.otp);

    const user = await this.db.users.findOne({
      where: { id: userId },
      relations: { roles: true, permissions: true },
    });

    if (!user) {
      throw new InvalidCredentialsException();
    }

    user.accountStatus = AccountStatus.Active;
    user.isPhoneVerified = true;
    await this.db.users.save(user);

    const tokens = await this.token.issueTokenPair(user, ip, userAgent);

    let profile: SysLeadProfiles | undefined;
    if (user.userType === UserType.Lead) {
      profile =
        (await this.db.leadProfiles.findOne({
          where: { userId: user.id },
        })) ?? undefined;
    }

    this.logger.info('OTP verified successfully', {
      context: 'AuthService.verifyOtp',
      userId: user.id,
      action: 'VERIFY_OTP_SUCCESS',
    });

    return this.authResponseMapper.toAuthResponse(user, tokens, profile);
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
      userId: otpUserPayload.userId,
      phone: PhoneNumberUtil.mask(otpUserPayload.phone),
      action: 'RESEND_OTP_START',
    });

    await this.otp.canResendOtp(otpUserPayload.phone, ip);

    const plainOtp = await this.otp.generateAndStoreOtp(
      otpUserPayload.userId,
      otpUserPayload.phone,
    );

    await this.sms.sendOtp(otpUserPayload.phone, plainOtp);

    const otpToken = this.jwt.generateOtpToken({
      userId: otpUserPayload.userId,
      phone: otpUserPayload.phone,
      purpose: 'phone_verify',
    });

    this.logger.info('OTP resent successfully', {
      context: 'AuthService.resendOtp',
      userId: otpUserPayload.userId,
      action: 'RESEND_OTP_SUCCESS',
    });

    return {
      otpAccessToken: otpToken,
      expiresIn: 300,
      message: 'OTP resent successfully.',
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
      accessToken: newAccessToken,
      expiresIn: 900,
    };
  }

  /**
   * Resend OTP using credentials (phone + password) to issue a new OTP access token
   */
  async resendOtpWithCredentials(
    dto: ResendOtpCredentialsDto,
    ip?: string,
  ): Promise<RegisterLeadResponseDto> {
    const user = await this.db.users.findOne({
      where: { phone: dto.phone },
      relations: { roles: true, permissions: true },
    });

    if (!user) {
      throw new InvalidCredentialsException();
    }

    // Only allow if not yet verified
    if (user.accountStatus !== AccountStatus.NotValid) {
      throw new InvalidCredentialsException();
    }

    const passwordValid = await this.hasher.verify(
      dto.password,
      user.passwordHash,
    );
    if (!passwordValid) {
      throw new InvalidCredentialsException();
    }

    const plainOtp = await this.otp.generateAndStoreOtp(user.id, user.phone);
    await this.sms.sendOtp(user.phone, plainOtp);

    const otpToken = this.jwt.generateOtpToken({
      userId: user.id,
      phone: user.phone,
      purpose: 'phone_verify',
    });

    this.logger.info('OTP resent via credentials', {
      context: 'AuthService.resendOtpWithCredentials',
      userId: user.id,
      phone: PhoneNumberUtil.mask(user.phone),
      action: 'RESEND_OTP_CREDENTIALS_SUCCESS',
      ip,
    });

    return {
      otpAccessToken: otpToken,
      expiresIn: 300,
      message: 'OTP sent successfully. Please verify your phone.',
      ...(this.isDevelopment && { devOtp: plainOtp }),
    };
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
