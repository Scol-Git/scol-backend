import {
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiTooManyRequestsResponse,
  ApiConflictResponse,
  ApiBody,
  ApiBearerAuth,
  getSchemaPath,
} from '@nestjs/swagger';
import {
  SwaggerDocSet,
  registerSwaggerDocs,
} from '@api/common/swagger/swagger-docs.registry';
import { RegisterLeadRequestDto } from '@shared/dtos/auth/RegisterLeadRequestDto';
import { RegisterLeadResponseDto } from '@shared/dtos/auth/RegisterLeadResponseDto';
import { VerifyOtpDto } from '@shared/dtos/auth/VerifyOtpDto';
import { LoginRequestDto } from '@shared/dtos/auth/LoginRequestDto';
import { AuthResponseDto } from '@shared/dtos/auth/AuthResponseDto';
import { RefreshTokenRequestDto } from '@shared/dtos/auth/RefreshTokenRequestDto';
import { TokenRefreshResponseDto } from '@shared/dtos/auth/TokenRefreshResponseDto';
import { LogoutRequestDto } from '@shared/dtos/auth/LogoutRequestDto';
import { UserDto } from '@shared/dtos/auth/UserDto';
import { ResendOtpCredentialsDto } from '@shared/dtos/auth/ResendOtpCredentialsDto';

const docs: Record<string, SwaggerDocSet> = {
  // ============================================
  // REGISTRATION & OTP FLOW
  // ============================================
  'auth.register': [
    ApiOperation({
      summary: 'Register new lead/student',
      description:
        'Register a new lead account with phone and password. Returns OTP access token for phone verification.',
    }),
    ApiBody({
      schema: { $ref: getSchemaPath(RegisterLeadRequestDto) },
      examples: {
        default: {
          summary: 'Lead registration',
          value: {
            phone: '01837917991',
            password: 'SecureP@ss123',
            fullName: 'John Doe',
          },
        },
      },
    }),
    ApiOkResponse({
      description:
        'Registration successful. OTP sent via SMS. Use otpAccessToken for verify-otp endpoint.',
      schema: { $ref: getSchemaPath(RegisterLeadResponseDto) },
    }),
    ApiConflictResponse({
      description: 'Phone already exists',
      schema: {
        example: {
          type: 'about:blank',
          title: 'Domain Error',
          status: 409,
          detail:
            'Phone number 01837917991 is already registered. Please use a different phone number or login.',
          instance: '/auth/register',
          timestamp: '2025-12-08T00:00:00.000Z',
          code: 'PHONE_ALREADY_EXISTS',
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid input (phone format, password strength, etc.)',
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (5 registrations per hour per IP)',
    }),
  ],

  'auth.verifyOtp': [
    ApiOperation({
      summary: 'Verify OTP after registration',
      description:
        'Verify phone number with OTP code. Activates account and returns access/refresh tokens.',
    }),
    ApiBody({
      schema: { $ref: getSchemaPath(VerifyOtpDto) },
      examples: {
        default: {
          summary: 'OTP verification',
          value: {
            otp: '123456',
          },
        },
      },
    }),
    ApiOkResponse({
      description:
        'OTP verified successfully. Account activated. Returns auth tokens and user info.',
      schema: { $ref: getSchemaPath(AuthResponseDto) },
    }),
    ApiBadRequestResponse({
      description:
        'Invalid OTP, OTP expired, or maximum attempts exceeded (3 attempts)',
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired OTP access token',
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (10 attempts per 5 minutes)',
    }),
  ],

  'auth.resendOtp': [
    ApiOperation({
      summary: 'Resend OTP',
      description:
        'Request a new OTP code. Subject to cooldown (60 seconds) and daily limits.',
    }),
    ApiOkResponse({
      description: 'New OTP sent successfully via SMS',
      schema: { $ref: getSchemaPath(RegisterLeadResponseDto) },
    }),
    ApiBadRequestResponse({
      description:
        'Resend cooldown active or daily limit exceeded (5 OTPs per phone, 20 per IP)',
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired OTP access token',
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (3 resends per 5 minutes)',
    }),
  ],

  'auth.resendOtpCredentials': [
    ApiOperation({
      summary: 'Resend OTP using credentials',
      description:
        'Request a new OTP code using phone + password when OTP access token has expired. Subject to the same rate limits as resend-otp.',
    }),
    ApiBody({
      schema: { $ref: getSchemaPath(ResendOtpCredentialsDto) },
      examples: {
        default: {
          summary: 'Resend OTP with credentials',
          value: {
            phone: '01837917991',
            password: 'SecureP@ss123',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'New OTP sent successfully via SMS',
      schema: { $ref: getSchemaPath(RegisterLeadResponseDto) },
    }),
    ApiBadRequestResponse({
      description: 'Invalid input (phone format, password strength, etc.)',
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid credentials or account not eligible for OTP resend',
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (3 resends per 5 minutes)',
    }),
  ],

  // ============================================
  // LOGIN & TOKEN MANAGEMENT
  // ============================================
  'auth.login': [
    ApiOperation({
      summary: 'Login with phone or email',
      description:
        'Authenticate user with phone/email and password. Leads use phone, other users use email.',
    }),
    ApiBody({
      schema: { $ref: getSchemaPath(LoginRequestDto) },
      examples: {
        leadLogin: {
          summary: 'Login with phone (for leads)',
          value: {
            phone: '01837917991',
            password: 'SecureP@ss123',
          },
        },
        userLogin: {
          summary: 'Login with email (for admins/counselors)',
          value: {
            email: 'admin@scol.com',
            password: 'SecureP@ss123',
          },
        },
      },
    }),
    ApiOkResponse({
      description:
        'Login successful. Returns access/refresh tokens and user info.',
      schema: { $ref: getSchemaPath(AuthResponseDto) },
    }),
    ApiBadRequestResponse({
      description:
        'Invalid credentials, account not verified, or missing email/phone',
    }),
    ApiForbiddenResponse({
      description:
        'Account locked due to multiple failed attempts (5 attempts). Check message for unlock time.',
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (10 attempts per 15 minutes per IP)',
    }),
  ],

  'auth.refresh': [
    ApiOperation({
      summary: 'Refresh access token',
      description:
        'Get a new access token using refresh token. Refresh tokens are valid for 7 days.',
    }),
    ApiBody({
      schema: { $ref: getSchemaPath(RefreshTokenRequestDto) },
      examples: {
        default: {
          summary: 'Refresh token request',
          value: {
            refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'New access token issued successfully',
      schema: { $ref: getSchemaPath(TokenRefreshResponseDto) },
    }),
    ApiUnauthorizedResponse({
      description:
        'Invalid, expired, or revoked refresh token. Session not found.',
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (20 requests per 5 minutes)',
    }),
  ],

  'auth.logout': [
    ApiOperation({
      summary: 'Logout current or specific session',
      description:
        'Revoke refresh token session. If sessionId provided, revokes that session. Otherwise revokes current session.',
    }),
    ApiBearerAuth(),
    ApiBody({
      schema: { $ref: getSchemaPath(LogoutRequestDto) },
      required: false,
      examples: {
        currentSession: {
          summary: 'Logout current session',
          value: {},
        },
        specificSession: {
          summary: 'Logout specific session',
          value: {
            sessionId: '123e4567-e89b-12d3-a456-426614174000',
          },
        },
      },
    }),
    ApiOkResponse({
      description: 'Logged out successfully',
      schema: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Logged out successfully' },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Invalid or expired access token' }),
  ],

  'auth.logoutAll': [
    ApiOperation({
      summary: 'Logout all sessions',
      description:
        'Revoke all refresh token sessions for the current user. Useful for security purposes.',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'All sessions logged out successfully',
      schema: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            example: 'All sessions logged out successfully',
          },
        },
      },
    }),
    ApiUnauthorizedResponse({ description: 'Invalid or expired access token' }),
  ],

  // ============================================
  // USER PROFILE
  // ============================================
  'auth.me': [
    ApiOperation({
      summary: 'Get current user profile',
      description:
        'Returns complete user profile including roles, permissions, and lead profile data if applicable.',
    }),
    ApiOkResponse({
      description: 'User profile retrieved successfully',
      schema: { $ref: getSchemaPath(UserDto) },
    }),
    ApiUnauthorizedResponse({ description: 'Invalid or expired access token' }),
  ],
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
