import { DataSource } from 'typeorm';
import { TestModuleBuilder } from '../../setup/builders/TestModuleBuilder';
import { AuthService } from '@bll/services/AuthService.service';
import { User } from '@entity/entities/User.entity';
import { Organization } from '@entity/entities/Organization.entity';
import { RefreshToken } from '@entity/entities/RefreshToken.entity';
import { UserRole } from '@entity/entities/UserRole.entity';
import { RolePermission } from '@entity/entities/RolePermission.entity';
import {
  ILogger as ILoggerToken,
  IJwtService as IJwtServiceToken,
  IPasswordHasher as IPasswordHasherToken,
  IAppConfig as IAppConfigToken,
  IAuthService,
} from '@shared/tokens/injection.tokens';
import { RegisterRequestDto } from '@shared/dtos/auth/RegisterRequestDto.dto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto.dto';
import { RefreshTokenRequestDto } from '@shared/dtos/auth/RefreshTokenRequestDto.dto';
import { ForgotPasswordRequestDto } from '@shared/dtos/auth/ForgotPasswordRequestDto.dto';
import { ResetPasswordRequestDto } from '@shared/dtos/auth/ResetPasswordRequestDto.dto';
import { NotFoundException, ConflictException } from '@nestjs/common';
import {
  InvalidCredentialsException,
} from '@shared/exceptions/auth/InvalidCredentialsException';
import { AccountLockedException } from '@shared/exceptions/auth/AccountLockedException';
import { InvalidTokenException } from '@shared/exceptions/auth/InvalidTokenException';
import { UserStatus } from '@shared/enums/UserStatus.enum';
import {
  createMockRepository,
  createMockLogger,
  createMockJwtService,
  createMockPasswordHasher,
  createMockAppConfig,
  createMockDataSource,
  createMockQueryBuilder,
} from '../../setup/mocks';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserRepo: ReturnType<typeof createMockRepository>;
  let mockOrgRepo: ReturnType<typeof createMockRepository>;
  let mockRefreshTokenRepo: ReturnType<typeof createMockRepository>;
  let mockUserRoleRepo: ReturnType<typeof createMockRepository>;
  let mockRolePermissionRepo: ReturnType<typeof createMockRepository>;
  let mockDataSource: ReturnType<typeof createMockDataSource>;
  let mockUserRoleQueryBuilder: ReturnType<typeof createMockQueryBuilder>;
  let mockRolePermissionQueryBuilder: ReturnType<typeof createMockQueryBuilder>;

  const orgId = 'test-org-id';
  const userId = 'test-user-id';

  beforeEach(async () => {
    // Create repository mocks
    mockUserRepo = createMockRepository();
    mockOrgRepo = createMockRepository();
    mockRefreshTokenRepo = createMockRepository();
    mockUserRoleRepo = createMockRepository();
    mockRolePermissionRepo = createMockRepository();

    // Create QueryBuilder mocks
    mockUserRoleQueryBuilder = createMockQueryBuilder();
    mockRolePermissionQueryBuilder = createMockQueryBuilder();
    mockUserRoleRepo.createQueryBuilder.mockReturnValue(mockUserRoleQueryBuilder);
    mockRolePermissionRepo.createQueryBuilder.mockReturnValue(mockRolePermissionQueryBuilder);

    // Create DataSource mock with repository map (using Map to avoid TypeScript computed property errors)
    const repositoryMap = new Map();
    repositoryMap.set(User, mockUserRepo);
    repositoryMap.set(Organization, mockOrgRepo);
    repositoryMap.set(RefreshToken, mockRefreshTokenRepo);
    repositoryMap.set(UserRole, mockUserRoleRepo);
    repositoryMap.set(RolePermission, mockRolePermissionRepo);
    mockDataSource = createMockDataSource(repositoryMap as any);

    // Create other mocks
    const mockLogger = createMockLogger();
    const mockJwtService = createMockJwtService();
    const mockPasswordHasher = createMockPasswordHasher();
    const mockAppConfig = createMockAppConfig();

    // Build testing module
    const builder = new TestModuleBuilder()
      .addClassProvider(IAuthService, AuthService)
      .addClassProvider(AuthService, AuthService)
      .addProvider(DataSource, mockDataSource)
      .addProvider(ILoggerToken, mockLogger)
      .addProvider(IJwtServiceToken, mockJwtService)
      .addProvider(IPasswordHasherToken, mockPasswordHasher)
      .addProvider(IAppConfigToken, mockAppConfig);

    const moduleRef = await builder.compile();
    service = moduleRef.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const dto: RegisterRequestDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const org = { id: orgId, name: 'Test Org' };
      const savedUser: any = {
        id: userId,
        email: dto.email,
        orgId,
        status: UserStatus.Active,
        emailVerified: false,
      };

      mockUserRepo.findOne.mockResolvedValue(null);
      mockOrgRepo.findOne.mockResolvedValue(org);
      mockUserRepo.create.mockReturnValue(savedUser);
      mockUserRepo.save.mockResolvedValue(savedUser);
      mockUserRoleQueryBuilder.getMany.mockResolvedValue([]);
      mockRolePermissionQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.register(dto, orgId);

      // Assert
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: dto.email, orgId },
      });
      expect(mockOrgRepo.findOne).toHaveBeenCalledWith({ where: { id: orgId } });
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw ConflictException when user already exists', async () => {
      // Arrange
      const dto: RegisterRequestDto = {
        email: 'existing@example.com',
        password: 'password123',
      };
      const existingUser = { id: userId, email: dto.email, orgId };
      mockUserRepo.findOne.mockResolvedValue(existingUser);

      // Act & Assert
      await expect(service.register(dto, orgId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException when organization does not exist', async () => {
      // Arrange
      const dto: RegisterRequestDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      mockUserRepo.findOne.mockResolvedValue(null);
      mockOrgRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.register(dto, orgId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      // Arrange
      const dto: LoginRequestDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const user: any = {
        id: userId,
        email: dto.email,
        orgId,
        passwordHash: 'hashed-password123',
        status: UserStatus.Active,
        failedLoginAttempts: 0,
        lockedUntil: undefined,
        canLogin: jest.fn(() => true),
      };

      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue(user);
      mockUserRoleQueryBuilder.getMany.mockResolvedValue([]);
      mockRolePermissionQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.login(dto, orgId);

      // Assert
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: dto.email, orgId },
      });
      expect(result.accessToken).toBeDefined();
    });

    it('should throw InvalidCredentialsException when user not found', async () => {
      // Arrange
      const dto: LoginRequestDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };
      mockUserRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(dto, orgId)).rejects.toThrow(
        InvalidCredentialsException,
      );
    });

    it('should throw AccountLockedException when account is locked', async () => {
      // Arrange
      const dto: LoginRequestDto = {
        email: 'test@example.com',
        password: 'password123',
      };
      const user: any = {
        id: userId,
        email: dto.email,
        orgId,
        passwordHash: 'hashed-password',
        status: UserStatus.Locked,
        canLogin: jest.fn(() => false),
        lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
      };

      mockUserRepo.findOne.mockResolvedValue(user);

      // Act & Assert
      await expect(service.login(dto, orgId)).rejects.toThrow(
        AccountLockedException,
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'valid-refresh-token',
      };
      const payload = {
        sub: userId,
        orgId,
        email: 'test@example.com',
        roles: [],
        permissions: [],
      };
      const user: any = {
        id: userId,
        email: 'test@example.com',
        orgId,
        status: UserStatus.Active,
        canLogin: jest.fn(() => true),
      };
      const refreshTokenEntity: any = {
        id: 'token-id',
        userId,
        tokenHash: 'hashed-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        isValid: jest.fn(() => true),
        user,
        revokedAt: undefined,
      };

      const mockJwtService = createMockJwtService();
      mockJwtService.verifyToken.mockReturnValue(payload);

      // Rebuild module with updated JWT service
      const builder = new TestModuleBuilder()
        .addClassProvider(IAuthService, AuthService)
        .addClassProvider(AuthService, AuthService)
        .addProvider(DataSource, mockDataSource)
        .addProvider(ILoggerToken, createMockLogger())
        .addProvider(IJwtServiceToken, mockJwtService)
        .addProvider(IPasswordHasherToken, createMockPasswordHasher())
        .addProvider(IAppConfigToken, createMockAppConfig());

      const moduleRef = await builder.compile();
      service = moduleRef.get(AuthService);

      mockRefreshTokenRepo.findOne.mockResolvedValue(refreshTokenEntity);
      mockRefreshTokenRepo.save.mockResolvedValue(refreshTokenEntity);
      mockUserRoleQueryBuilder.getMany.mockResolvedValue([]);
      mockRolePermissionQueryBuilder.getMany.mockResolvedValue([]);

      // Act
      const result = await service.refreshToken(dto);

      // Assert
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('should throw InvalidTokenException when token is invalid', async () => {
      // Arrange
      const dto: RefreshTokenRequestDto = {
        refreshToken: 'invalid-token',
      };

      const mockJwtService = createMockJwtService();
      mockJwtService.verifyToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      // Rebuild module
      const builder = new TestModuleBuilder()
        .addClassProvider(IAuthService, AuthService)
        .addClassProvider(AuthService, AuthService)
        .addProvider(DataSource, mockDataSource)
        .addProvider(ILoggerToken, createMockLogger())
        .addProvider(IJwtServiceToken, mockJwtService)
        .addProvider(IPasswordHasherToken, createMockPasswordHasher())
        .addProvider(IAppConfigToken, createMockAppConfig());

      const moduleRef = await builder.compile();
      service = moduleRef.get(AuthService);

      // Act & Assert
      await expect(service.refreshToken(dto)).rejects.toThrow(
        InvalidTokenException,
      );
    });
  });

  describe('forgotPassword', () => {
    it('should generate password reset token for existing user', async () => {
      // Arrange
      const dto: ForgotPasswordRequestDto = {
        email: 'test@example.com',
      };
      const user: any = {
        id: userId,
        email: dto.email,
        orgId,
        passwordResetToken: undefined,
        passwordResetTokenExpiresAt: undefined,
      };

      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue(user);

      // Act
      await service.forgotPassword(dto, orgId);

      // Assert
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: dto.email, orgId },
      });
      expect(user.passwordResetToken).toBeDefined();
      expect(user.passwordResetTokenExpiresAt).toBeDefined();
    });

    it('should silently return when user does not exist', async () => {
      // Arrange
      const dto: ForgotPasswordRequestDto = {
        email: 'nonexistent@example.com',
      };
      mockUserRepo.findOne.mockResolvedValue(null);

      // Act
      await service.forgotPassword(dto, orgId);

      // Assert
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { email: dto.email, orgId },
      });
      expect(mockUserRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      // Arrange
      const dto: ResetPasswordRequestDto = {
        token: 'valid-reset-token',
        newPassword: 'newPassword123',
      };
      const user: any = {
        id: userId,
        email: 'test@example.com',
        orgId,
        passwordResetToken: 'hashed-token',
        passwordResetTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        passwordHash: 'old-hash',
        failedLoginAttempts: 3,
        lockedUntil: new Date(),
      };

      mockUserRepo.findOne.mockResolvedValue(user);
      mockUserRepo.save.mockResolvedValue(user);

      // Act
      await service.resetPassword(dto, orgId);

      // Assert
      expect(mockUserRepo.findOne).toHaveBeenCalled();
      expect(user.passwordHash).toBeDefined();
      expect(user.passwordResetToken).toBeUndefined();
      expect(user.failedLoginAttempts).toBe(0);
    });

    it('should throw InvalidTokenException when token is invalid', async () => {
      // Arrange
      const dto: ResetPasswordRequestDto = {
        token: 'invalid-token',
        newPassword: 'newPassword123',
      };
      mockUserRepo.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.resetPassword(dto, orgId)).rejects.toThrow(
        InvalidTokenException,
      );
    });
  });
});

