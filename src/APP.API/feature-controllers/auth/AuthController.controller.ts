import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Headers,
  Req,
  BadRequestException,
} from '@nestjs/common';

// Swagger imports
import { ApiExtraModels, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import './swagger.doc';

// Guards imports
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { OtpJwtGuard } from '@api/common/guards/OtpJwtGuard.guard';
import { RateLimitGuard } from '@api/common/guards/RateLimitGuard.guard';

// Decorators imports
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { OtpUser } from '@api/common/decorators/OtpUser.decorator';
import { RateLimit } from '@api/common/decorators/RateLimit.decorator';
import {
  ReqInfo,
  ReqInfoPayload,
} from '@api/common/decorators/ReqInfo.decorator';

// Types imports
import type { ICurrentUser } from '@shared/interfaces/domain';
import type { OtpUserPayload } from '@shared/interfaces/auth/OtpUserPayload.interface';
import type { Request } from 'express';

// Services imports
import { AuthService } from '@bll/services/auth/AuthService';

// Request DTOs imports
import { RegisterLeadRequestDto } from '@shared/dtos/auth/RegisterLeadRequestDto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import { VerifyOtpRequestDto } from '@shared/dtos/auth/VerifyOtpRequestDto';
import { ForgotPasswordRequestDto } from '@shared/dtos/auth/ForgotPasswordRequestDto';
import { ResetPasswordRequestDto } from '@shared/dtos/auth/ResetPasswordRequestDto';

// Response DTOs imports
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { RegisterLeadResponseDto } from '@shared/dtos/auth/RegisterLeadResponseDto';
import { PasswordResetTokenResponseDto } from '@shared/dtos/auth/PasswordResetTokenResponseDto';
import { TokenRefreshResponseDto } from '@shared/dtos/auth/TokenRefreshResponseDto';
import { ResendOtpResponseDto } from '@shared/dtos/auth/ResendOtpResponseDto';

// Common DTOs imports
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';

/**
 * Auth Controller
 *
 * Handles authentication endpoints:
 * - Registration (leads only)
 * - OTP verification
 * - OTP resend
 * - Login (all user types)
 */
@ApiTags('auth')
@ApiExtraModels(
  RegisterLeadResponseDto,
  RegisterLeadRequestDto,
  VerifyOtpRequestDto,
  LoginRequestDto,
  AuthResponseDto,
  TokenRefreshResponseDto,
  SuccessResponseDto,
  ErrorResponseDto,
  ForgotPasswordRequestDto,
  ResetPasswordRequestDto,
  PasswordResetTokenResponseDto,
)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new lead/student
   * POST /auth/register
   */
  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowSeconds: 3600 }) // 5 registrations per hour per IP
  @AddSwaggerDoc('auth', 'register')
  async register(
    @Body() dto: RegisterLeadRequestDto,
  ): Promise<RegisterLeadResponseDto> {
    return await this.authService.registerLead(dto);
  }

  /**
   * Verify OTP after registration or for password reset
   * POST /auth/verify-otp
   * Requires: OTP JWT token in Authorization header
   *
   * For registration (purpose=phone_verify): Returns auth tokens and creates user account
   * For password reset (purpose=password_reset): Returns password reset token
   */
  @Post('verify-otp')
  @UseGuards(OtpJwtGuard)
  @RateLimit({ limit: 10, windowSeconds: 300 }) // 10 OTP attempts per 5 minutes
  @ApiBearerAuth('OTP-auth')
  @AddSwaggerDoc('auth', 'verifyOtp')
  async verifyOtp(
    @Body() dto: VerifyOtpRequestDto,
    @OtpUser() otpUser: OtpUserPayload,
    @ReqInfo() reqInfo: ReqInfoPayload,
  ): Promise<AuthResponseDto | PasswordResetTokenResponseDto> {
    return await this.authService.verifyOtp(
      dto,
      otpUser,
      reqInfo.ip,
      reqInfo.userAgent,
    );
  }

  /**
   * Resend OTP
   * GET /auth/resend-otp
   * Requires: OTP JWT token in Authorization header
   */
  @Get('resend-otp')
  @UseGuards(OtpJwtGuard)
  @ApiBearerAuth('OTP-auth')
  @AddSwaggerDoc('auth', 'resendOtp')
  async resendOtp(
    @OtpUser() otpUser: OtpUserPayload,
  ): Promise<ResendOtpResponseDto> {
    return this.authService.resendOtp(otpUser);
  }

  /**
   * Login
   * POST /auth/login
   * Leads login with phone, others with email
   */
  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 10, windowSeconds: 900 }) // 10 login attempts per 15 minutes per IP
  @AddSwaggerDoc('auth', 'login')
  async login(
    @Body() dto: LoginRequestDto,
    @ReqInfo() reqInfo: ReqInfoPayload,
  ): Promise<AuthResponseDto> {
    return await this.authService.login(dto, reqInfo.ip, reqInfo.userAgent);
  }

  /**
   * Refresh access token
   * GET /auth/refresh
   * Requires: Refresh JWT token in Authorization header
   */
  @Get('refresh')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowSeconds: 300 }) // 20 refresh requests per 5 minutes
  @ApiBearerAuth('JWT-auth')
  @AddSwaggerDoc('auth', 'refresh')
  async refresh(
    @Headers('authorization') authHeader: string | undefined,
    @ReqInfo() reqInfo: ReqInfoPayload,
  ): Promise<TokenRefreshResponseDto> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new BadRequestException(
        'Refresh token is required in Authorization header',
      );
    }
    const refreshToken = authHeader.substring(7);
    return await this.authService.refreshAccessToken(refreshToken, reqInfo.ip);
  }

  /**
   * Logout current session
   * GET /auth/logout
   * Requires: Access JWT token in Authorization header
   */
  @Get('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @AddSwaggerDoc('auth', 'logout')
  async logout(
    @ReqInfo() reqInfo: ReqInfoPayload,
  ): Promise<{ message: string }> {
    await this.authService.logout(reqInfo.ip, reqInfo.userAgent);
    return { message: 'Logged out successfully' };
  }

  /**
   * Forgot Password - Initiate password reset
   * POST /auth/forgot-password
   * Sends OTP to user's phone and returns password reset token
   */
  @Post('forgot-password')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 5, windowSeconds: 3600 }) // 5 requests per hour per IP
  @AddSwaggerDoc('auth', 'forgotPassword')
  async forgotPassword(
    @Body() dto: ForgotPasswordRequestDto,
    @ReqInfo() reqInfo: ReqInfoPayload,
  ): Promise<RegisterLeadResponseDto> {
    return await this.authService.forgotPassword(dto, reqInfo.ip);
  }

  /**
   * Reset Password - Update password after OTP verification
   * POST /auth/reset-password
   * Requires: Password reset token in Authorization header (obtained after OTP verification)
   * Returns: Auth tokens and user info (user is automatically logged in)
   */
  @Post('reset-password')
  @UseGuards(OtpJwtGuard, RateLimitGuard)
  @RateLimit({ limit: 5, windowSeconds: 300 }) // 5 attempts per 5 minutes
  @ApiBearerAuth('OTP-auth')
  @AddSwaggerDoc('auth', 'resetPassword')
  async resetPassword(
    @Body() dto: ResetPasswordRequestDto,
    @OtpUser() otpUser: OtpUserPayload,
    @ReqInfo() reqInfo: ReqInfoPayload,
  ): Promise<AuthResponseDto> {
    return await this.authService.resetPassword(
      dto,
      otpUser,
      reqInfo.ip,
      reqInfo.userAgent,
    );
  }
}
