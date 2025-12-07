import {
  Body,
  Controller,
  Post,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ApiExtraModels, ApiTags } from '@nestjs/swagger';
import { AddSwaggerDoc } from '@api/common/swagger/add-swagger-doc.decorator';
import { SendOtpDto } from './dto/SendOtp.dto';
import { VerifyOtpDto } from './dto/VerifyOtp.dto';
import { SetPasswordDto } from './dto/SetPassword.dto';
import { RegisterDto } from './dto/Register.dto';
import { LoginDto } from './dto/Login.dto';
import './swagger.doc';

@ApiTags('auth')
@ApiExtraModels(SendOtpDto, VerifyOtpDto, SetPasswordDto, RegisterDto, LoginDto)
@Controller('auth')
export class AuthController {
  @Post('send-otp')
  @AddSwaggerDoc('auth', 'sendOtp')
  async sendOtp(@Body() dto: SendOtpDto) {
    return this.handle(() => ({
      status: 'ok',
      action: 'send-otp',
      phone: dto.phone,
      message: 'OTP sent (mock). Implement service to deliver real OTP.',
      timestamp: new Date().toISOString(),
    }));
  }

  @Post('verify-otp')
  @AddSwaggerDoc('auth', 'verifyOtp')
  async verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.handle(() => ({
      status: 'ok',
      action: 'verify-otp',
      phone: dto.phone,
      verified: true,
      message: 'OTP verified (mock). Implement service to validate OTP.',
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      timestamp: new Date().toISOString(),
    }));
  }

  @Post('set-password')
  @AddSwaggerDoc('auth', 'setPassword')
  async setPassword(@Body() dto: SetPasswordDto) {
    return this.handle(() => ({
      status: 'ok',
      action: 'set-password',
      phone: dto.phone,
      message: 'Password set (mock). Implement service to persist hash.',
      timestamp: new Date().toISOString(),
    }));
  }

  @Post('register')
  @AddSwaggerDoc('auth', 'register')
  async register(@Body() dto: RegisterDto) {
    return this.handle(() => ({
      status: 'ok',
      action: 'register',
      name: dto.name,
      email: dto.email,
      phone: dto.phone,
      isPhoneVerified: dto.isPhoneVerified ?? false,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      message:
        'User registered (mock). In production, require verified phone + set password before issuing tokens.',
      timestamp: new Date().toISOString(),
    }));
  }

  @Post('login')
  @AddSwaggerDoc('auth', 'login')
  async login(@Body() dto: LoginDto) {
    return this.handle(() => ({
      status: 'ok',
      action: 'login',
      phone: dto.phone,
      accessToken: 'mock-access-token',
      refreshToken: 'mock-refresh-token',
      message: 'Login success (mock). Implement service for real auth and tokens.',
      timestamp: new Date().toISOString(),
    }));
  }

  private async handle<T>(fn: () => T | Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new InternalServerErrorException('Unexpected error');
    }
  }
}

