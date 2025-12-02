import {
  Injectable,
  Inject,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource as DbContext } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes, createHash } from 'crypto';
import type { ILogger } from '@shared/interfaces/logging';
import type { IJwtService, JwtPayload } from '@shared/interfaces/security';
import type { IPasswordHasher } from '@shared/interfaces/security';
import type { IAppConfig } from '@shared/interfaces/config/IAppConfig.interface';
import type { IAuthService } from '@shared/interfaces/services';
import {
  ILogger as ILoggerToken,
  IJwtService as IJwtServiceToken,
  IPasswordHasher as IPasswordHasherToken,
  IAppConfig as IAppConfigToken,
  IFirebaseService as IFirebaseServiceToken,
} from '@shared/tokens/injection.tokens';
import type { IFirebaseService } from '@shared/interfaces/security';
import { InvalidCredentialsException } from '@shared/exceptions/auth/InvalidCredentialsException';
import { AccountLockedException } from '@shared/exceptions/auth/AccountLockedException';
import { InvalidTokenException } from '@shared/exceptions/auth/InvalidTokenException';
import { QueryBuilderConstants } from '@shared/constants/QueryBuilder.constants';
import { User } from '@entity/entities/User.entity';
import { Organization } from '@entity/entities/Organization.entity';
import { UserRole } from '@entity/entities/UserRole.entity';
import { RolePermission } from '@entity/entities/RolePermission.entity';
import { RefreshToken } from '@entity/entities/RefreshToken.entity';
import { UserStatus } from '@shared/enums/UserStatus.enum';
import { RegisterRequestDto } from '@shared/dtos/auth/RegisterRequestDto.dto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto.dto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto.dto';
import { RefreshTokenRequestDto } from '@shared/dtos/auth/RefreshTokenRequestDto.dto';
import { ForgotPasswordRequestDto } from '@shared/dtos/auth/ForgotPasswordRequestDto.dto';
import { ResetPasswordRequestDto } from '@shared/dtos/auth/ResetPasswordRequestDto.dto';
import { FirebaseLoginRequestDto } from '@shared/dtos/auth/FirebaseLoginRequestDto.dto';
import { FirebaseVerifyPhoneRequestDto } from '@shared/dtos/auth/FirebaseVerifyPhoneRequestDto.dto';

/**
 * Auth Service
 *
 * Handles authentication and authorization operations.
 * Supports email/password and OAuth authentication.
 *
 * @implements {IAuthService}
 */
@Injectable()
export class AuthService implements IAuthService {
  constructor(
    @InjectDataSource() private readonly _dbContext: DbContext,
    @Inject(ILoggerToken) private readonly _logger: ILogger,
    @Inject(IJwtServiceToken) private readonly _jwtService: IJwtService,
    @Inject(IPasswordHasherToken)
    private readonly _passwordHasher: IPasswordHasher,
    @Inject(IAppConfigToken) private readonly _appConfig: IAppConfig,
    @Inject(IFirebaseServiceToken) private readonly _firebaseService: IFirebaseService,
  ) {}

  /**
   * Register a new user with email and password
   */
  async register(
    dto: RegisterRequestDto,
    orgId: string,
  ): Promise<AuthResponseDto> {
    // Check if user already exists
    const existingUser = await this._dbContext
      .getRepository(User)
      .findOne({ where: { email: dto.email, orgId } });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Verify organization exists
    const org = await this._dbContext
      .getRepository(Organization)
      .findOne({ where: { id: orgId } });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    // Hash password
    const passwordHash = await this._passwordHasher.hashPassword(dto.password);

    // Generate email verification token
    const emailVerificationToken = randomBytes(32).toString('hex');

    // Create user
    const user = this._dbContext.getRepository(User).create({
      email: dto.email,
      passwordHash,
      orgId,
      status: UserStatus.Active,
      emailVerified: false,
      emailVerificationToken,
    });

    await this._dbContext.getRepository(User).save(user);

    this._logger.LogInfo('User registered', {
      userId: user.id,
      email: user.email,
    });

    // Generate tokens
    const permissions = await this._getUserPermissions(user.id, orgId);
    const roles = await this._getUserRoles(user.id, orgId);

    return this._generateAuthResponse(user, roles, permissions);
  }

  /**
   * Login with email and password
   */
  async login(dto: LoginRequestDto, orgId: string): Promise<AuthResponseDto> {
    // Find user
    const user = await this._dbContext
      .getRepository(User)
      .findOne({ where: { email: dto.email, orgId } });

    if (!user || !user.passwordHash) {
      throw new InvalidCredentialsException();
    }

    // Check if user can login
    if (!user.canLogin()) {
      throw new AccountLockedException(user.lockedUntil);
    }

    // Verify password
    const isValid = await this._passwordHasher.verifyPassword(
      dto.password,
      user.passwordHash,
    );

    if (!isValid) {
      // Increment failed login attempts
      user.failedLoginAttempts += 1;

      // Lock account after threshold failed attempts
      if (
        user.failedLoginAttempts >= this._appConfig.auth.accountLockoutThreshold
      ) {
        const lockoutDuration =
          this._appConfig.auth.accountLockoutDurationMinutes * 60 * 1000;
        user.lockedUntil = new Date(Date.now() + lockoutDuration);
        user.status = UserStatus.Locked;
        await this._dbContext.getRepository(User).save(user);
        throw new AccountLockedException(user.lockedUntil);
      }

      await this._dbContext.getRepository(User).save(user);
      throw new InvalidCredentialsException();
    }

    // Reset failed login attempts and update last login
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;
    user.lastLoginAt = new Date();
    await this._dbContext.getRepository(User).save(user);

    // Get permissions and roles
    const permissions = await this._getUserPermissions(user.id, orgId);
    const roles = await this._getUserRoles(user.id, orgId);

    this._logger.LogInfo('User logged in', {
      userId: user.id,
      email: user.email,
    });

    return this._generateAuthResponse(user, roles, permissions);
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(dto: RefreshTokenRequestDto): Promise<AuthResponseDto> {
    // Verify refresh token
    let payload: JwtPayload;
    try {
      payload = this._jwtService.verifyToken(dto.refreshToken);
    } catch {
      throw new InvalidTokenException('Invalid refresh token');
    }

    // Find refresh token in database
    const tokenHash = this._hashToken(dto.refreshToken);
    const refreshToken = await this._dbContext
      .getRepository(RefreshToken)
      .findOne({
        where: { tokenHash, userId: payload.sub },
        relations: ['user'],
      });

    if (!refreshToken || !refreshToken.isValid()) {
      throw new InvalidTokenException('Invalid or expired refresh token');
    }

    // Revoke old token
    refreshToken.revokedAt = new Date();
    await this._dbContext.getRepository(RefreshToken).save(refreshToken);

    // Get user
    const user = refreshToken.user;
    if (!user || !user.canLogin()) {
      throw new AccountLockedException(user?.lockedUntil);
    }

    // Get permissions and roles
    const permissions = await this._getUserPermissions(user.id, payload.orgId);
    const roles = await this._getUserRoles(user.id, payload.orgId);

    return this._generateAuthResponse(user, roles, permissions);
  }

  /**
   * Request password reset
   */
  async forgotPassword(
    dto: ForgotPasswordRequestDto,
    orgId: string,
  ): Promise<void> {
    const user = await this._dbContext
      .getRepository(User)
      .findOne({ where: { email: dto.email, orgId } });

    if (!user) {
      // Don't reveal if user exists for security
      return;
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const tokenHash = this._hashToken(resetToken);

    user.passwordResetToken = tokenHash;
    const expirationHours =
      this._appConfig.auth.passwordResetTokenExpirationHours;
    user.passwordResetTokenExpiresAt = new Date(
      Date.now() + expirationHours * 60 * 60 * 1000,
    );

    await this._dbContext.getRepository(User).save(user);

    this._logger.LogInfo('Password reset requested', {
      userId: user.id,
      email: user.email,
    });

    // TODO: Send email with reset token
  }

  /**
   * Reset password using reset token
   */
  async resetPassword(
    dto: ResetPasswordRequestDto,
    orgId: string,
  ): Promise<void> {
    const tokenHash = this._hashToken(dto.token);

    const user = await this._dbContext.getRepository(User).findOne({
      where: {
        passwordResetToken: tokenHash,
        orgId,
      },
    });

    if (!user || !user.passwordResetTokenExpiresAt) {
      throw new InvalidTokenException('Invalid or expired reset token');
    }

    if (user.passwordResetTokenExpiresAt < new Date()) {
      throw new InvalidTokenException('Reset token has expired');
    }

    // Update password
    user.passwordHash = await this._passwordHasher.hashPassword(
      dto.newPassword,
    );
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiresAt = undefined;
    user.failedLoginAttempts = 0;
    user.lockedUntil = undefined;

    await this._dbContext.getRepository(User).save(user);

    this._logger.LogInfo('Password reset completed', {
      userId: user.id,
      email: user.email,
    });
  }

  /**
   * Get user permissions (from roles)
   */
  private async _getUserPermissions(
    userId: string,
    orgId: string,
  ): Promise<string[]> {
    // Get permissions from roles using explicit RolePermission junction table
    const userRoles = await this._dbContext
      .getRepository(UserRole)
      .createQueryBuilder(QueryBuilderConstants.USER_ROLE_ALIAS)
      .innerJoinAndSelect(
        QueryBuilderConstants.JOIN_ROLE,
        QueryBuilderConstants.ROLE_ALIAS,
      )
      .where(QueryBuilderConstants.WHERE_USER_ID, {
        [QueryBuilderConstants.PARAM_USER_ID]: userId,
      })
      .andWhere(QueryBuilderConstants.WHERE_ORG_ID, {
        [QueryBuilderConstants.PARAM_ORG_ID]: orgId,
      })
      .getMany();

    const roleIds = userRoles.map((ur) => ur.roleId);
    if (roleIds.length === 0) {
      return [];
    }

    // Get permissions for all user roles
    const rolePermissions = await this._dbContext
      .getRepository(RolePermission)
      .createQueryBuilder(QueryBuilderConstants.ROLE_PERMISSION_ALIAS)
      .innerJoinAndSelect(
        QueryBuilderConstants.JOIN_PERMISSION,
        QueryBuilderConstants.PERMISSION_ALIAS,
      )
      .where(QueryBuilderConstants.WHERE_ROLE_IDS, {
        [QueryBuilderConstants.PARAM_ROLE_IDS]: roleIds,
      })
      .getMany();

    const permissionNames = new Set<string>();
    for (const rolePermission of rolePermissions) {
      if (rolePermission.permission) {
        permissionNames.add(rolePermission.permission.name);
      }
    }

    return Array.from(permissionNames);
  }

  /**
   * Get user roles
   */
  private async _getUserRoles(
    userId: string,
    orgId: string,
  ): Promise<string[]> {
    const userRoles = await this._dbContext
      .getRepository(UserRole)
      .createQueryBuilder(QueryBuilderConstants.USER_ROLE_ALIAS)
      .innerJoinAndSelect(
        QueryBuilderConstants.JOIN_ROLE,
        QueryBuilderConstants.ROLE_ALIAS,
      )
      .where(QueryBuilderConstants.WHERE_USER_ID, {
        [QueryBuilderConstants.PARAM_USER_ID]: userId,
      })
      .andWhere(QueryBuilderConstants.WHERE_ORG_ID, {
        [QueryBuilderConstants.PARAM_ORG_ID]: orgId,
      })
      .getMany();

    return userRoles
      .map((ur) => ur.role?.name)
      .filter((name): name is string => !!name);
  }

  /**
   * Generate authentication response with tokens
   */
  private async _generateAuthResponse(
    user: User,
    roles: string[],
    permissions: string[],
  ): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      orgId: user.orgId,
      email: user.email,
      roles,
      permissions,
      isSuperAdmin: false, // TODO: Implement super admin check
    };

    const accessToken = this._jwtService.generateAccessToken(payload);
    const refreshToken = this._jwtService.generateRefreshToken(payload);

    // Save refresh token to database
    const tokenHash = this._hashToken(refreshToken);
    const expirationDays = this._appConfig.auth.refreshTokenExpirationDays;
    const refreshTokenEntity = this._dbContext
      .getRepository(RefreshToken)
      .create({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + expirationDays * 24 * 60 * 60 * 1000),
      });

    await this._dbContext.getRepository(RefreshToken).save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        roles,
        permissions,
      },
    };
  }

  /**
   * Login with Firebase ID token (Google authentication)
   */
  async loginWithFirebase(
    dto: FirebaseLoginRequestDto,
    orgId?: string,
  ): Promise<AuthResponseDto> {
    // Verify Firebase ID token
    const firebaseUser = await this._firebaseService.verifyIdToken(dto.idToken);

    if (!firebaseUser.email) {
      throw new ConflictException('Email is required for Firebase authentication');
    }

    // Find user by Firebase UID
    let user = await this._dbContext
      .getRepository(User)
      .findOne({ where: { firebaseUid: firebaseUser.uid } });

    let finalOrgId = orgId;

    if (user) {
      // User exists - use their existing orgId (ignore provided orgId if different)
      finalOrgId = user.orgId;
      
      // Update user info from Firebase if needed
      if (firebaseUser.email && user.email !== firebaseUser.email) {
        user.email = firebaseUser.email;
      }
      if (firebaseUser.email_verified !== undefined) {
        user.emailVerified = firebaseUser.email_verified;
      }
    } else {
      // User doesn't exist - need to determine orgId
      if (orgId) {
        // Verify organization exists if provided
        const org = await this._dbContext
          .getRepository(Organization)
          .findOne({ where: { id: orgId } });

        if (!org) {
          throw new NotFoundException('Organization not found');
        }

        // Check if user exists by email in this org (for linking accounts)
        user = await this._dbContext
          .getRepository(User)
          .findOne({ where: { email: firebaseUser.email, orgId } });

        if (user) {
          // Link Firebase UID to existing user
          user.firebaseUid = firebaseUser.uid;
          finalOrgId = user.orgId;
        } else {
          // Create new user in provided organization
          user = this._dbContext.getRepository(User).create({
            email: firebaseUser.email,
            orgId,
            status: UserStatus.Active,
            firebaseUid: firebaseUser.uid,
            emailVerified: firebaseUser.email_verified || false,
            phoneVerified: false, // Phone not verified yet
          });
        }
      } else {
        // No orgId provided - create personal organization for user
        const orgName = firebaseUser.name 
          ? `${firebaseUser.name}'s Organization`
          : `${firebaseUser.email}'s Organization`;

        // Check if personal org already exists (by name pattern)
        let personalOrg = await this._dbContext
          .getRepository(Organization)
          .findOne({ where: { name: orgName } });

        if (!personalOrg) {
          // Create personal organization
          personalOrg = this._dbContext.getRepository(Organization).create({
            name: orgName,
          });
          await this._dbContext.getRepository(Organization).save(personalOrg);
          this._logger.LogInfo('Created personal organization for Firebase user', {
            orgId: personalOrg.id,
            orgName,
          });
        }

        finalOrgId = personalOrg.id;

        // Check if user exists by email (might have been created in this org before)
        user = await this._dbContext
          .getRepository(User)
          .findOne({ where: { email: firebaseUser.email, orgId: finalOrgId } });

        if (user) {
          // Link Firebase UID to existing user
          user.firebaseUid = firebaseUser.uid;
        } else {
          // Create new user in personal organization
          user = this._dbContext.getRepository(User).create({
            email: firebaseUser.email,
            orgId: finalOrgId,
            status: UserStatus.Active,
            firebaseUid: firebaseUser.uid,
            emailVerified: firebaseUser.email_verified || false,
            phoneVerified: false, // Phone not verified yet
          });
        }
      }
    }

    // Ensure finalOrgId is set (should always be set at this point)
    if (!finalOrgId) {
      throw new Error('Organization ID is required but was not determined');
    }

    // Update last login
    user.lastLoginAt = new Date();
    await this._dbContext.getRepository(User).save(user);

    // Get permissions and roles
    const permissions = await this._getUserPermissions(user.id, finalOrgId);
    const roles = await this._getUserRoles(user.id, finalOrgId);

    this._logger.LogInfo('Firebase login successful', {
      userId: user.id,
      email: user.email,
      firebaseUid: firebaseUser.uid,
      orgId: finalOrgId,
    });

    return this._generateAuthResponse(user, roles, permissions);
  }

  /**
   * Verify phone number with Firebase ID token
   */
  async verifyPhoneWithFirebase(
    dto: FirebaseVerifyPhoneRequestDto,
  ): Promise<{ message: string }> {
    // Verify Firebase ID token (should include phone_number after OTP verification)
    const firebaseUser = await this._firebaseService.verifyIdToken(dto.idToken);

    if (!firebaseUser.phone_number) {
      throw new InvalidTokenException('Firebase token does not include phone number');
    }

    // Find user by Firebase UID
    const user = await this._dbContext
      .getRepository(User)
      .findOne({ where: { firebaseUid: firebaseUser.uid } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update phone number and verification status
    user.phone = firebaseUser.phone_number;
    user.phoneVerified = true;

    await this._dbContext.getRepository(User).save(user);

    this._logger.LogInfo('Phone verified via Firebase', {
      userId: user.id,
      phone: firebaseUser.phone_number,
      firebaseUid: firebaseUser.uid,
    });

    return { message: 'Phone number verified successfully' };
  }

  /**
   * Hash token for storage
   */
  private _hashToken(token: string): string {
    // Hash token using crypto module
    return createHash('sha256').update(token).digest('hex');
  }
}
