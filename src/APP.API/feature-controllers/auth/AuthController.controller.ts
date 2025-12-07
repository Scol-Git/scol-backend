import { Body, Controller, Post, Get, UseGuards, Headers } from '@nestjs/common';
import { ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import { SendOtpDto } from './dto/SendOtp.dto';
import { RegistrationRequestDto } from '@shared/dtos/auth/RegistrationRequest.dto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequest.dto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponse.dto';
import './swagger.doc';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import { JwtAuthGuard } from '@api/common/guards/JwtAuthGuard.guard';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { UserContextAccessor } from '@shared/context/UserContextAccessor';

@ApiTags('auth')
@ApiExtraModels(
  SendOtpDto,
  RegistrationRequestDto,
  LoginRequestDto,
  AuthResponseDto,
)
@Controller('auth')
export class AuthController {
  @Post('send-otp')
  @AddSwaggerDoc('auth', 'sendOtp')
  async sendOtp(
    @Headers('authorization') authorization: string | undefined,
    @Body() dto: SendOtpDto,
  ) {
    const accessTokenFromHeader =
      authorization && authorization.startsWith('Bearer ')
        ? authorization.substring(7)
        : undefined;

    return {
      status: 'ok',
      action: 'send-otp',
      accessToken: accessTokenFromHeader || dto.accessToken,
      phone: dto.phone,
      message: 'OTP sent (mock). Implement service to deliver real OTP.',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('verify-otp')
  @AddSwaggerDoc('auth', 'verifyOtp')
  async verifyOtp(@Body() dto: { phone: string; otp: string }) {
    return {
      status: 'ok',
      action: 'verify-otp',
      phone: dto.phone,
      accountStatus: 'verified',
      totalOtpAttempt: 1,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      message: 'OTP verified (mock). Implement service to validate OTP.',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('register')
  @AddSwaggerDoc('auth', 'register')
  async register(@Body() dto: RegistrationRequestDto): Promise<AuthResponseDto> {
    return {
      status: 'ok',
      action: 'register',
      phone: dto.phone,
      accountStatus: 'not_verified',
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      message:
        'User registered (mock). Verify OTP within 2 hours to activate the account.',
      verificationExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      timestamp: new Date().toISOString(),
    };
  }

  @Post('login')
  @AddSwaggerDoc('auth', 'login')
  async login(@Body() dto: LoginRequestDto): Promise<AuthResponseDto> {
    return {
      status: 'ok',
      action: 'login',
      phone: dto.phone ?? dto.email ?? '',
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      accountStatus: 'verified',
      message: 'Login success (mock). Implement service for real auth and tokens.',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @AddSwaggerDoc('auth', 'me')
  async me(@CurrentUser() user: ICurrentUser) {
    const userFromDecorator = user;
    const userFromContext = UserContextAccessor.tryGetUserContext();
    return {
      userFromDecorator,
      userFromContext,
    };
  }

}

