import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Get,
  Query,
  Param,
  Inject,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiHeader,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/JwtAuthGuard.guard';
import { PermissionGuard } from '../../common/guards/PermissionGuard.guard';
import { RoleGuard } from '../../common/guards/RoleGuard.guard';
import { CurrentUser } from '../../common/decorators/CurrentUser.decorator';
import { RequirePermission } from '../../common/decorators/RequirePermission.decorator';
import { RequireRole } from '../../common/decorators/RequireRole.decorator';
import type { IAuthService } from '@shared/interfaces/services';
import { IAuthService as IAuthServiceToken } from '@shared/tokens/injection.tokens';
import { RegisterRequestDto } from '@shared/dtos/auth/RegisterRequestDto.dto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto.dto';
import { RefreshTokenRequestDto } from '@shared/dtos/auth/RefreshTokenRequestDto.dto';
import { ForgotPasswordRequestDto } from '@shared/dtos/auth/ForgotPasswordRequestDto.dto';
import { ResetPasswordRequestDto } from '@shared/dtos/auth/ResetPasswordRequestDto.dto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto.dto';
import type { ICurrentUser } from '@shared/interfaces/domain';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { Permission } from '@shared/enums/Permission.enum';
import { Role } from '@shared/enums/Role.enum';

/**
 * Auth Controller
 *
 * Handles authentication endpoints: registration, login, token refresh, password reset.
 *
 * @controller AuthController
 */
@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(IAuthServiceToken) private readonly _authService: IAuthService,
    @Inject(ILoggerToken) private readonly _logger: ILogger,
  ) {}

  /**
   * Register a new user
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterRequestDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(
    @Body() dto: RegisterRequestDto,
    @Query('orgId') orgId: string,
  ): Promise<AuthResponseDto> {
    if (!orgId) {
      throw new ValidationException('orgId query parameter is required');
    }

    this._logger.LogInfo('User registration attempt', { email: dto.email });
    return this._authService.register(dto, orgId);
  }

  /**
   * Login with email and password
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiBody({ type: LoginRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginRequestDto,
    @Query('orgId') orgId: string,
  ): Promise<AuthResponseDto> {
    if (!orgId) {
      throw new ValidationException('orgId query parameter is required');
    }

    this._logger.LogInfo('User login attempt', { email: dto.email });
    return this._authService.login(dto, orgId);
  }

  /**
   * Refresh access token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenRequestDto })
  @ApiResponse({
    status: 200,
    description: 'Token refreshed successfully',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refreshToken(
    @Body() dto: RefreshTokenRequestDto,
  ): Promise<AuthResponseDto> {
    this._logger.LogInfo('Token refresh attempt');
    return this._authService.refreshToken(dto);
  }

  /**
   * Request password reset
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset' })
  @ApiBody({ type: ForgotPasswordRequestDto })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
    @Query('orgId') orgId: string,
  ): Promise<{ message: string }> {
    if (!orgId) {
      throw new ValidationException('orgId query parameter is required');
    }

    this._logger.LogInfo('Password reset requested', { email: dto.email });
    await this._authService.forgotPassword(dto, orgId);
    return {
      message: 'If the email exists, a password reset link has been sent',
    };
  }

  /**
   * Reset password with token
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({ type: ResetPasswordRequestDto })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async resetPassword(
    @Body() dto: ResetPasswordRequestDto,
    @Query('orgId') orgId: string,
  ): Promise<{ message: string }> {
    if (!orgId) {
      throw new ValidationException('orgId query parameter is required');
    }

    this._logger.LogInfo('Password reset attempt');
    await this._authService.resetPassword(dto, orgId);
    return { message: 'Password reset successfully' };
  }

  /**
   * Get current user profile
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getProfile(@CurrentUser() user: ICurrentUser): Promise<ICurrentUser> {
    return user;
  }

  /**
   * Example endpoint with permission check
   */
  @Get('example-permission')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.TODO_CREATE)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Example endpoint requiring permission : todo:create',
  })
  async exampleWithPermission(
    @CurrentUser() user: ICurrentUser,
  ): Promise<{ message: string }> {
    return {
      message: `You have the required permission! User: ${user.email}`,
    };
  }

  /**
   * Example endpoint with role check
   */
  @Get('example-role')
  @UseGuards(JwtAuthGuard, RoleGuard)
  @RequireRole(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Example endpoint requiring role : Admin' })
  async exampleWithRole(
    @CurrentUser() user: ICurrentUser,
  ): Promise<{ message: string }> {
    return {
      message: `You have the required role! User: ${user.email}`,
    };
  }

  /**
   * Login with Firebase ID token (Google authentication)
   * 
   * Authenticates a user using Firebase ID token received after Google sign-in.
   * If orgId is not provided:
   * - Existing users: Uses their current organization
   * - New users: Creates a personal organization automatically
   * 
   * @param request - Express request object to extract Authorization header
   * @param orgId - Optional organization ID to join (for new users)
   * @returns Authentication response with access token, refresh token, and user info
   */
  @Post('firebase/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Login with Firebase ID token (Google authentication)',
    description: 'Authenticates using Firebase ID token from Authorization header. orgId is optional - if not provided, existing users use their current org, new users get a personal organization created automatically.'
  })
  @ApiHeader({
    name: 'Authorization',
    description: 'Firebase ID token in Bearer format: Bearer <firebase-id-token>',
    required: true,
  })
  @ApiQuery({ 
    name: 'orgId', 
    required: false, 
    type: String,
    description: 'Optional organization ID. If provided and user is new, they will join this organization. If not provided, existing users use their current org, new users get a personal organization.'
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful - returns access token, refresh token, and user information',
    type: AuthResponseDto,
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid or expired Firebase ID token, or missing Authorization header' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Organization not found (only when orgId is provided and does not exist)' 
  })
  @ApiResponse({ 
    status: 409, 
    description: 'Email is required for Firebase authentication' 
  })
  async loginWithFirebase(
    @Req() request: Request,
    @Query('orgId') orgId?: string,
  ): Promise<AuthResponseDto> {
    const authHeader = request.headers.authorization;
    const idToken = this._extractTokenFromHeader(authHeader);
    this._logger.LogInfo('Firebase login attempt', { hasOrgId: !!orgId });
    return this._authService.loginWithFirebase(idToken, orgId);
  }

  /**
   * Verify phone number with Firebase ID token
   * 
   * Verifies a phone number using Firebase ID token received after OTP verification.
   * The Firebase token must include the phone_number claim.
   * Updates the user's phone number and sets phoneVerified to true.
   * 
   * @param request - Express request object to extract Authorization header
   * @returns Success message
   */
  @Post('firebase/verify-phone')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Verify phone number with Firebase ID token (after OTP verification)',
    description: 'Verifies phone number using Firebase ID token from Authorization header received after successful OTP verification. The token must include phone_number claim. Updates user record with verified phone number.'
  })
  @ApiHeader({
    name: 'authorization',
    description: 'Firebase ID token in Bearer format: Bearer <firebase-id-token> (must include phone_number claim)',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Phone number verified and saved successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Phone number verified successfully'
        }
      }
    }
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Invalid or expired Firebase token, missing Authorization header, or token does not include phone_number claim' 
  })
  @ApiResponse({ 
    status: 404, 
    description: 'User not found (user must exist and have firebaseUid set)' 
  })
  async verifyPhoneWithFirebase(
    @Req() request: Request,
  ): Promise<{ message: string }> {
    const authHeader = request.headers.authorization;
    const idToken = this._extractTokenFromHeader(authHeader);
    this._logger.LogInfo('Firebase phone verification attempt', {});
    return this._authService.verifyPhoneWithFirebase(idToken);
  }

  /**
   * Extract token from Authorization header
   * 
   * @param authHeader - Authorization header value
   * @returns Extracted token string
   * @throws UnauthorizedException if header is missing or invalid format
   */
  private _extractTokenFromHeader(authHeader: string | undefined): string {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid Authorization header. Expected format: Bearer <firebase-id-token>');
    }

    return authHeader.substring(7);
  }
}
