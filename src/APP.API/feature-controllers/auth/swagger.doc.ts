import {
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  getSchemaPath,
} from '@nestjs/swagger';
import { SwaggerDocSet, registerSwaggerDocs } from '@api/common/swagger/swagger-docs.registry';
import { SendOtpDto } from './dto/SendOtp.dto';
import { VerifyOtpDto } from './dto/VerifyOtp.dto';
import { SetPasswordDto } from './dto/SetPassword.dto';
import { RegisterDto } from './dto/Register.dto';
import { LoginDto } from './dto/Login.dto';

const docs: Record<string, SwaggerDocSet> = {
  'auth.sendOtp': [
    ApiOperation({ summary: 'Send OTP to phone' }),
    ApiBody({ schema: { $ref: getSchemaPath(SendOtpDto) } }),
    ApiOkResponse({ description: 'OTP sent (mock response).' }),
    ApiBadRequestResponse({ description: 'Invalid phone.' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized.' }),
  ],
  'auth.verifyOtp': [
    ApiOperation({ summary: 'Verify OTP' }),
    ApiBody({ schema: { $ref: getSchemaPath(VerifyOtpDto) } }),
    ApiOkResponse({
      description: 'OTP verified (mock response).',
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          action: { type: 'string', example: 'verify-otp' },
          phone: { type: 'string' },
          verified: { type: 'boolean', example: true },
          accessToken: { type: 'string', example: 'mock-access-token' },
          refreshToken: { type: 'string', example: 'mock-refresh-token' },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiBadRequestResponse({ description: 'Invalid OTP or phone.' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized.' }),
  ],
  'auth.setPassword': [
    ApiOperation({ summary: 'Set password after OTP verification' }),
    ApiBody({ schema: { $ref: getSchemaPath(SetPasswordDto) } }),
    ApiOkResponse({ description: 'Password set (mock response).' }),
    ApiBadRequestResponse({ description: 'Invalid request.' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized.' }),
  ],
  'auth.register': [
    ApiOperation({ summary: 'Register new user' }),
    ApiBody({ schema: { $ref: getSchemaPath(RegisterDto) } }),
    ApiOkResponse({
      description: 'Registered (mock response). Tokens returned after verified phone + password set.',
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          action: { type: 'string', example: 'register' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          isPhoneVerified: { type: 'boolean', example: true },
          accessToken: { type: 'string', example: 'mock-access-token' },
          refreshToken: { type: 'string', example: 'mock-refresh-token' },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiBadRequestResponse({ description: 'Invalid registration data.' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized.' }),
  ],
  'auth.login': [
    ApiOperation({ summary: 'Login with phone and password' }),
    ApiBody({ schema: { $ref: getSchemaPath(LoginDto) } }),
    ApiOkResponse({
      description: 'Login success (mock response).',
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          action: { type: 'string', example: 'login' },
          phone: { type: 'string' },
          accessToken: { type: 'string', example: 'mock-access-token' },
          refreshToken: { type: 'string', example: 'mock-refresh-token' },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    }),
    ApiBadRequestResponse({ description: 'Invalid credentials.' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized.' }),
  ],
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));

