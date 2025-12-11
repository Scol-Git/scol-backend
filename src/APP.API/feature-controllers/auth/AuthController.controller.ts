import {
  Body,
  Controller,
  Post,
  Get,
  UseGuards,
  Ip,
  Headers,
  Req,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiExtraModels, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { OtpUser } from '@api/common/decorators/OtpUser.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import { OtpJwtGuard } from '@api/common/guards/OtpJwtGuard.guard';
import { RateLimit } from '@api/common/decorators/RateLimit.decorator';
import {
  ReqInfo,
  ReqInfoPayload,
} from '@api/common/decorators/ReqInfo.decorator';
import { AuthService } from '@bll/services/auth/AuthService';

import { RegisterLeadResponseDto } from '@shared/dtos/auth/RegisterLeadResponseDto';
import { VerifyOtpDto } from '@shared/dtos/auth/VerifyOtpDto';
import { RegisterLeadRequestDto } from '@shared/dtos/auth/RegisterLeadRequestDto';

import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { TokenRefreshResponseDto } from '@shared/dtos/auth/TokenRefreshResponseDto';

import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import { UserDto } from '@shared/dtos/auth/UserDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';
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
  RegisterLeadResponseDto,
  RegisterLeadRequestDto,
  VerifyOtpDto,
  LoginRequestDto,
  AuthResponseDto,
  TokenRefreshResponseDto,
  UserDto,
  SuccessResponseDto,
  ErrorResponseDto,
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
    @ReqInfo() reqInfo: ReqInfoPayload,
  ): Promise<AuthResponseDto> {
    console.log('reqInfo', reqInfo);
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
    @OtpUser() otpUserPayload: OtpUserPayload,
    @ReqInfo() reqInfo: ReqInfoPayload,
  ): Promise<RegisterLeadResponseDto> {
    return await this.authService.resendOtp(otpUserPayload, reqInfo.ip);
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
    @Req() reqInfo: { ip: string; userAgent: string },
  ): Promise<AuthResponseDto> {
    return await this.authService.login(dto, reqInfo.ip, reqInfo.userAgent);
  }

  /**
   * Refresh access token
   * GET /auth/refresh?refreshToken=...
   */
  @Get('refresh')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, windowSeconds: 300 }) // 20 refresh requests per 5 minutes
  @AddSwaggerDoc('auth', 'refresh')
  async refresh(
    @Query('refreshToken') refreshToken: string | undefined,
    @ReqInfo() reqInfo: ReqInfoPayload,
  ): Promise<TokenRefreshResponseDto> {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    return await this.authService.refreshAccessToken(
      refreshToken,
      reqInfo.ip,
    );
  }

  /**
   * Logout current session
   * GET /auth/logout
   * Requires: Access JWT token in Authorization header
   */
  @Get('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @AddSwaggerDoc('auth', 'logout')
  async logout(
    @CurrentUser() user: ICurrentUser,
  ): Promise<{ message: string }> {
    await this.authService.logout(user.userId);
    return { message: 'Logged out successfully' };
  }


  
 
}
