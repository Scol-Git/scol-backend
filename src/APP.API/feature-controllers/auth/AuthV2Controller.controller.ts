import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import './swagger.doc';

import { OtpJwtBodyGuard } from '@api/common/guards/OtpJwtBodyGuard.guard';

import { OtpUser } from '@api/common/decorators/OtpUser.decorator';
import { RateLimit } from '@api/common/decorators/RateLimit.decorator';
import {
  ReqInfo,
  ReqInfoPayload,
} from '@api/common/decorators/ReqInfo.decorator';

import type { OtpUserPayload } from '@shared/interfaces/auth/OtpUserPayload.interface';

import { AuthService } from '@bll/services/auth/AuthService';

import { VerifyOtpV2RequestDto } from '@shared/dtos/auth/VerifyOtpV2RequestDto';
import { ResendOtpV2RequestDto } from '@shared/dtos/auth/ResendOtpV2RequestDto';

import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { AuthResponseUserDto } from '@shared/dtos/auth/AuthResponseUserDto';
import { ResendOtpResponseDto } from '@shared/dtos/auth/ResendOtpResponseDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';

/**
 * Auth V2 Controller
 *
 * Body-token variants of OTP endpoints. Existing header-token routes on
 * AuthController remain unchanged.
 */
@ApiTags('auth')
@ApiExtraModels(
  VerifyOtpV2RequestDto,
  ResendOtpV2RequestDto,
  AuthResponseDto,
  AuthResponseUserDto,
  ResendOtpResponseDto,
  SuccessResponseDto,
  ErrorResponseDto,
)
@Controller('v2/auth')
export class AuthV2Controller {
  constructor(private readonly authService: AuthService) {}

  /**
   * Verify OTP after registration or for password reset
   * POST /v2/auth/verify-otp
   * Requires: OTP JWT token in request body as otpAccessToken
   */
  @Post('verify-otp')
  @UseGuards(OtpJwtBodyGuard)
  @RateLimit({ limit: 10, windowSeconds: 300 })
  @AddSwaggerDoc('auth', 'verifyOtpV2')
  async verifyOtp(
    @Body() dto: VerifyOtpV2RequestDto,
    @OtpUser() otpUser: OtpUserPayload,
    @ReqInfo() reqInfo: ReqInfoPayload,
  ): Promise<AuthResponseDto> {
    return await this.authService.verifyOtp(
      { otp: dto.otp },
      otpUser,
      reqInfo.ip,
      reqInfo.userAgent,
    );
  }

  /**
   * Resend OTP
   * POST /v2/auth/resend-otp
   * Requires: OTP JWT token in request body as otpAccessToken
   */
  @Post('resend-otp')
  @UseGuards(OtpJwtBodyGuard)
  @AddSwaggerDoc('auth', 'resendOtpV2')
  async resendOtp(
    @Body() _dto: ResendOtpV2RequestDto,
    @OtpUser() otpUser: OtpUserPayload,
  ): Promise<ResendOtpResponseDto> {
    return this.authService.resendOtp(otpUser);
  }
}
