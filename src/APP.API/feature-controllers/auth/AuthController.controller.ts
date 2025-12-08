import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Ip,
  Headers,
  Req,
} from '@nestjs/common';
import { ApiExtraModels, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { OtpUser } from '@api/common/decorators/OtpUser.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { OtpJwtGuard } from '@api/common/guards/OtpJwtGuard.guard';
import { RateLimit } from '@api/common/decorators/RateLimit.decorator';
import { AuthService } from '@bll/services/auth/AuthService';
import { RegisterLeadRequestDto } from '@shared/dtos/auth/RegisterLead.dto';
import { RegisterLeadResponseDto } from '@shared/dtos/auth/OtpVerificationResponse.dto';
import { VerifyOtpDto } from '@shared/dtos/auth/VerifyOtp.dto';
import { ResendOtpDto } from '@shared/dtos/auth/ResendOtp.dto';
import { LoginRequestDto } from '@shared/dtos/auth/Login.dto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { RefreshTokenRequestDto } from '@shared/dtos/auth/RefreshTokenRequestDto';
import { TokenRefreshResponseDto } from '@shared/dtos/auth/TokenRefreshResponseDto';
import { LogoutRequestDto } from '@shared/dtos/auth/LogoutRequestDto';
import { UserDto } from '@shared/dtos/auth/UserDto';
import type { ICurrentUser } from '@shared/interfaces/domain';
import type { OtpUserPayload } from '@shared/interfaces/auth/OtpUserPayload.interface';
import type { Request } from 'express';
import './swagger.doc';
import { RateLimitGuard } from '@api/common/guards/RateLimitGuard.guard';
import { UserContextAccessor } from '@shared/context/UserContextAccessor';

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
  RegisterLeadRequestDto,
  RegisterLeadResponseDto,
  VerifyOtpDto,
  ResendOtpDto,
  LoginRequestDto,
  AuthResponseDto,
  RefreshTokenRequestDto,
  TokenRefreshResponseDto,
  LogoutRequestDto,
  UserDto,
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

    // return {
    //   otpAccessToken: '1234567890',
    //   expiresIn: 300,
    //   message: 'OTP sent successfully.',
    // };
  }

  /**
   * Verify OTP after registration
   * POST /auth/verify-otp
   * Requires: OTP JWT token in Authorization header
   */
  @Post('verify-otp')
  @UseGuards(OtpJwtGuard)
  @RateLimit({ limit: 10, windowSeconds: 300 }) // 10 OTP attempts per 5 minutes
  @ApiBearerAuth('OTP-auth')
  @AddSwaggerDoc('auth', 'verifyOtp')
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @OtpUser() otpUser: OtpUserPayload,
    @Req() req: Request,
  ): Promise<AuthResponseDto> {
    const ip = req.ip;
    const userAgent =
      typeof req.headers['user-agent'] === 'string'
        ? req.headers['user-agent']
        : req.headers['user-agent']?.[0];

    return await this.authService.verifyOtp(dto, otpUser, ip, userAgent);
  }

  /**
   * Resend OTP
   * POST /auth/resend-otp
   * Requires: OTP JWT token in Authorization header
   */
  @Post('resend-otp')
  @UseGuards(OtpJwtGuard)
  @ApiBearerAuth('OTP-auth')
  @AddSwaggerDoc('auth', 'resendOtp')
  async resendOtp(
    @OtpUser() otpUserPayload: OtpUserPayload,
    @Req() req: Request,
  ): Promise<RegisterLeadResponseDto> {
    const ip = req.ip || '';
    return await this.authService.resendOtp(otpUserPayload, ip);
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
    @Ip() ip: string,
    @Headers('user-agent') userAgent?: string,
  ): Promise<AuthResponseDto> {
    return await this.authService.login(dto, ip, userAgent);
  }

  /**
   * Refresh access token
   * POST /auth/refresh
   */
  @Post('refresh')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowSeconds: 300 }) // 20 refresh requests per 5 minutes
  @AddSwaggerDoc('auth', 'refresh')
  async refresh(
    @Body() dto: RefreshTokenRequestDto,
    @Ip() ip: string,
  ): Promise<TokenRefreshResponseDto> {
    return await this.authService.refreshAccessToken(dto.refreshToken, ip);
  }

  /**
   * Logout current or specific session
   * POST /auth/logout
   * Requires: Access JWT token in Authorization header
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @AddSwaggerDoc('auth', 'logout')
  async logout(
    @CurrentUser() user: ICurrentUser,
    @Body() dto: LogoutRequestDto,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.userId, dto.sessionId);
    return { message: 'Logged out successfully' };
  }

  /**
   * Logout all sessions
   * POST /auth/logout-all
   * Requires: Access JWT token in Authorization header
   */
  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @AddSwaggerDoc('auth', 'logoutAll')
  async logoutAll(
    @CurrentUser() user: ICurrentUser,
  ): Promise<{ message: string }> {
    await this.authService.logoutAll(user.userId);
    return { message: 'All sessions logged out successfully' };
  }

  /**
   * Get current user info
   * GET /auth/me
   * Requires: Access JWT token in Authorization header
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @AddSwaggerDoc('auth', 'me')
  async me(): Promise<UserDto> {
    const user = UserContextAccessor.userContext;
    return await this.authService.getCurrentUser(user.userId);
  }
}
