import { Injectable, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { IPasswordHasher } from '@shared/interfaces/security';
import {
  IPasswordHasher as IPasswordHasherToken,
  IRateLimitingStorage as IRateLimitingStorageToken,
} from '@shared/tokens/injection.tokens';
import type { IRateLimitingStorage } from '@shared/interfaces/infrastructure/IRateLimitingStorage.interface';
import { IApplicationConfig } from '@shared/interfaces/config/IApplicationConfig.interface';
import { IApplicationConfig as IApplicationConfigToken } from '@shared/tokens/injection.tokens';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { AuthValidationService } from './AuthValidationService';
import { SessionService } from './SessionService';
import { AuthResponseMapper } from '@bll/mappings/auth/AuthResponseMapper';
import { LeadProfileService } from '@bll/services/leads/LeadProfileService';
import { UserType } from '@shared/enums/UserType.enum';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { InvalidCredentialsException } from '@shared/exceptions/auth/InvalidCredentialsException';
import { PhoneNumberUtil } from '@shared/utils/PhoneNumberUtil';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';

const DUMMY_PASSWORD_HASH =
  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

@Injectable()
export class LoginService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(IPasswordHasherToken) private readonly hasher: IPasswordHasher,
    private readonly validation: AuthValidationService,
    private readonly sessionService: SessionService,
    private readonly authResponseMapper: AuthResponseMapper,
    private readonly leadProfileService: LeadProfileService,
    @Inject(IApplicationConfigToken)
    private readonly appConfig: IApplicationConfig,
    @Inject(IRateLimitingStorageToken)
    private readonly rateLimitStorage: IRateLimitingStorage,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async login(
    dto: LoginRequestDto,
    ip?: string,
    userAgent?: string,
  ): Promise<AuthResponseDto> {
    this.validation.validateLoginRequest(dto);

    const identifier = dto.phone || dto.email!;
    await this.enforceAccountRateLimit(identifier);

    this.logger.LogInfo('Login attempt', {
      context: 'LoginService.login',
      identifier: PhoneNumberUtil.maskIdentifier(identifier),
      ip,
      action: 'LOGIN_START',
    });

    const user = await this.db.users.findOne({
      where: dto.phone ? { phone: dto.phone } : { email: dto.email },
      relations: { roles: true, permissions: true },
    });

    if (!user) {
      await this.hasher.verify(dto.password, DUMMY_PASSWORD_HASH);
      this.logger.warn('Login failed - user not found', {
        context: 'LoginService.login',
        identifier: PhoneNumberUtil.maskIdentifier(identifier),
        action: 'LOGIN_FAILED_NOT_FOUND',
      });
      throw new InvalidCredentialsException();
    }

    await this.clearExpiredLockIfNeeded(user.id);

    if (user.accountStatus === AccountStatus.Locked && user.lockedUntil) {
      if (user.lockedUntil > new Date()) {
        this.logger.warn('Login denied - account locked', {
          context: 'LoginService.login',
          userId: user.id,
          action: 'LOGIN_DENIED_LOCKED',
        });
        throw new InvalidCredentialsException();
      }
    }

    const isPasswordValid = await this.hasher.verify(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      await this.recordFailedAttempt(user.id);
      this.logger.warn('Login failed - invalid password', {
        context: 'LoginService.login',
        userId: user.id,
        action: 'LOGIN_FAILED_INVALID_PASSWORD',
      });
      throw new InvalidCredentialsException();
    }

    const loginCheck = this.validation.canUserLogin(user);
    if (!loginCheck.allowed) {
      this.logger.warn('Login denied', {
        context: 'LoginService.login',
        userId: user.id,
        reason: loginCheck.reason,
        action: 'LOGIN_DENIED',
      });
      throw new InvalidCredentialsException();
    }

    await this.db.users.update(
      { id: user.id },
      {
        failedLoginAttempts: 0,
        lockedUntil: null as unknown as undefined,
        lastFailedLoginAt: null as unknown as undefined,
        accountStatus:
          user.accountStatus === AccountStatus.Locked
            ? AccountStatus.Active
            : user.accountStatus,
      },
    );

    const tokens = await this.sessionService.createSession(user, ip, userAgent);

    let profile: SysLeadProfiles | undefined;
    if (user.userType === UserType.Lead) {
      profile =
        (await this.db.leadProfiles.findOne({
          where: { userId: user.id },
        })) ?? undefined;
    }

    this.logger.LogInfo('Login successful', {
      context: 'LoginService.login',
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

  private async clearExpiredLockIfNeeded(userId: string): Promise<void> {
    await this.db.users
      .createQueryBuilder()
      .update()
      .set({
        accountStatus: AccountStatus.Active,
        failedLoginAttempts: 0,
        lockedUntil: () => 'NULL',
      })
      .where('id = :userId', { userId })
      .andWhere('accountStatus = :locked', { locked: AccountStatus.Locked })
      .andWhere('lockedUntil IS NOT NULL')
      .andWhere('lockedUntil <= :now', { now: new Date() })
      .execute();
  }

  private async recordFailedAttempt(userId: string): Promise<void> {
    const now = new Date();
    await this.db.users.increment({ id: userId }, 'failedLoginAttempts', 1);
    await this.db.users.update({ id: userId }, { lastFailedLoginAt: now });

    const user = await this.db.users.findOne({ where: { id: userId } });
    if (!user) {
      return;
    }

    if (
      user.failedLoginAttempts >= this.appConfig.auth.accountLockoutThreshold
    ) {
      await this.db.users.update(
        { id: userId },
        {
          accountStatus: AccountStatus.Locked,
          lockedUntil: new Date(
            Date.now() +
              this.appConfig.auth.accountLockoutDurationMinutes * 60 * 1000,
          ),
        },
      );
    }
  }

  private async enforceAccountRateLimit(identifier: string): Promise<void> {
    const key = `account:${identifier}:/auth/login`;
    const limit = 10;
    const windowSeconds = 900;
    const result = await this.rateLimitStorage.increment(
      key,
      windowSeconds,
      limit,
    );
    if (result.count > limit) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests, please try again later',
          retryAfter: result.reset - Math.floor(Date.now() / 1000),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }
}
