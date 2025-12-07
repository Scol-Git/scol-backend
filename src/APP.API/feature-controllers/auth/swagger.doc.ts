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
import { RegistrationRequestDto } from '@shared/dtos/auth/RegistrationRequest.dto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequest.dto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponse.dto';

const docs: Record<string, SwaggerDocSet> = {
  'auth.sendOtp': [
    ApiOperation({ summary: 'Send OTP to phone' }),
    ApiBody({
      schema: { $ref: getSchemaPath(SendOtpDto) },
      examples: {
        default: {
          summary: 'Send OTP request',
          value: {
            accessToken: 'mock-access-token',
            phone: '01787350115',
          },
        },
      },
    }),
    ApiOkResponse({ description: 'OTP sent (mock response).' }),
    ApiBadRequestResponse({ description: 'Invalid phone.' }),
    ApiUnauthorizedResponse({ description: 'Unauthorized.' }),
  ],
  'auth.verifyOtp': [
    ApiOperation({ summary: 'Verify OTP' }),
    ApiBody({
      schema: {
        type: 'object',
        properties: {
          phone: { type: 'string', example: '01787350115' },
          otp: { type: 'string', example: '123456' },
        },
        required: ['phone', 'otp'],
      },
      examples: {
        default: {
          summary: 'Verify OTP request',
          value: {
            phone: '01787350115',
            otp: '123456',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'OTP verified (mock response).',
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          action: { type: 'string', example: 'verify-otp' },
          phone: { type: 'string' },
          accountStatus: { type: 'string', example: 'verified' },
          totalOtpAttempt: { type: 'number', example: 1 },
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
  'auth.register': [
    ApiOperation({ summary: 'Register new user' }),
    ApiBody({
      schema: { $ref: getSchemaPath(RegistrationRequestDto) },
      examples: {
        default: {
          summary: 'Registration request',
          value: {
            phone: '01787350115',
            password: 'StrongPassw0rd!',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Registered (mock response). Tokens returned after verified phone + password set.',
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          action: { type: 'string', example: 'register' },
          phone: { type: 'string' },
          accountStatus: { type: 'string', example: 'not_verified' },
          verificationExpiresAt: {
            type: 'string',
            format: 'date-time',
            example: '2025-12-07T21:45:00.000Z',
          },
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
    ApiBody({
      schema: { $ref: getSchemaPath(LoginRequestDto) },
      examples: {
        default: {
          summary: 'Login request with phone',
          value: {
            phone: '01787350115',
            password: 'StrongPassw0rd!',
          },
        },
        withEmail: {
          summary: 'Login request with email',
          value: {
            email: 'user@example.com',
            password: 'StrongPassw0rd!',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Login success (mock response).',
      schema: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          action: { type: 'string', example: 'login' },
          phone: { type: 'string' },
          accountStatus: { type: 'string', example: 'verified' },
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
  'auth.me': [
    ApiOperation({ summary: 'Get current user profile' }),
    ApiOkResponse({
      description: 'Returns user info from decorator and context.',
      schema: {
        type: 'object',
        properties: {
          userFromDecorator: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'user-id' },
              email: { type: 'string', example: 'user@example.com' },
              roles: { type: 'array', items: { type: 'string' } },
            },
          },
          userFromContext: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'string', example: 'user-id' },
              email: { type: 'string', example: 'user@example.com' },
              roles: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Unauthorized.' }),
  ],
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));

