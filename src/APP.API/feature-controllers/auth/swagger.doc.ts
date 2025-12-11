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
import { TokenRefreshResponseDto } from '@shared/dtos/auth/TokenRefreshResponseDto';

import { UserDto } from '@shared/dtos/auth/UserDto';
import { SuccessResponseDto } from '@shared/dtos/common/SuccessResponseDto';
import { ErrorResponseDto } from '@shared/dtos/common/ErrorResponseDto';


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
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(RegisterLeadResponseDto),
              },
            },
          },
        ],
      },
    }),
    ApiConflictResponse({
      description: 'Phone already exists',
      schema: {
        allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
        examples: {
          phoneExists: {
            summary: 'Phone already registered',
            value: {
              status: 'error',
              message:
                'Phone number 01837917991 is already registered. Please use a different phone number or login.',
              statusCode: 409,
              error: {
                code: 'PHONE_ALREADY_EXISTS',
                details: {
                  phone: ['PHONE_ALREADY_EXISTS'],
                },
              },
            },
          },
        },
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid input (phone format, password strength, etc.)',
      schema: {
        allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
        examples: {
          validationError: {
            summary: 'Validation error',
            value: {
              status: 'error',
              message: 'Phone must be a valid 11-digit Bangladesh number starting with 01',
              statusCode: 400,
              error: {
                details: {
                  phone: [
                    'Phone must be a valid 11-digit Bangladesh number starting with 01',
                  ],
                },
              },
            },
          },
        },
      },
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (5 registrations per hour per IP)',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
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
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(AuthResponseDto),
              },
            },
          },
        ],
      },
    }),
    ApiBadRequestResponse({
      description:
        'Invalid OTP, OTP expired, or maximum attempts exceeded (3 attempts)',
      schema: {
        allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
        examples: {
          invalidOtp: {
            summary: 'Invalid OTP',
            value: {
              status: 'error',
              message:
                'The OTP you entered is incorrect. Please check and try again.',
              statusCode: 400,
              error: {
                code: 'INVALID_OTP',
              },
            },
          },
          otpExpired: {
            summary: 'OTP expired',
            value: {
              status: 'error',
              message: 'Your OTP has expired. Please request a new OTP.',
              statusCode: 400,
              error: {
                code: 'OTP_EXPIRED',
              },
            },
          },
          attemptsExceeded: {
            summary: 'Maximum attempts exceeded',
            value: {
              status: 'error',
              message:
                'You have exceeded the maximum number of OTP verification attempts (3). Please request a new OTP.',
              statusCode: 400,
              error: {
                code: 'OTP_ATTEMPTS_EXCEEDED',
              },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired OTP access token',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (10 attempts per 5 minutes)',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
  ],

  'auth.resendOtp': [
    ApiOperation({
      summary: 'Resend OTP',
      description:
        'Request a new OTP code. Subject to strict cooldown (1 resend per 60 seconds) and hourly limit (maximum 3 resends per hour). Requires OTP JWT token in Authorization header. Returns 429 Too Many Requests with Retry-After header when limits are exceeded.',
    }),
    ApiBearerAuth('OTP-auth'),
    ApiOkResponse({
      description: 'New OTP sent successfully via SMS',
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(RegisterLeadResponseDto),
              },
            },
          },
        ],
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired OTP access token',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiTooManyRequestsResponse({
      description:
        'Rate limit exceeded. Returns 429 with Retry-After header indicating seconds to wait. Applies to: (1) Cooldown: 1 resend per 60 seconds, (2) Hourly limit: maximum 3 resends per hour.',
      schema: {
        allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
        examples: {
          cooldown: {
            summary: 'Resend cooldown active (60 seconds)',
            value: {
              status: 'error',
              message: 'Please wait 45 seconds before requesting a new OTP.',
              statusCode: 429,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
              },
            },
            headers: {
              'Retry-After': {
                description: 'Seconds to wait before retrying',
                schema: { type: 'integer', example: 45 },
              },
            },
          },
          hourlyLimit: {
            summary: 'Hourly limit exceeded (3 per hour)',
            value: {
              status: 'error',
              message:
                'You have exceeded the hourly OTP resend limit (3 per hour). Please wait 1800 seconds.',
              statusCode: 429,
              error: {
                code: 'RATE_LIMIT_EXCEEDED',
              },
            },
            headers: {
              'Retry-After': {
                description: 'Seconds to wait before retrying',
                schema: { type: 'integer', example: 1800 },
              },
            },
          },
        },
      },
    }),
  ],

  'auth.resendOtpCredentials': [
    ApiOperation({
      summary: 'Resend OTP using credentials',
      description:
        'Request a new OTP code using phone + password when OTP access token has expired. Subject to the same rate limits as resend-otp.',
    }),
   
    ApiOkResponse({
      description: 'New OTP sent successfully via SMS',
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(RegisterLeadResponseDto),
              },
            },
          },
        ],
      },
    }),
    ApiBadRequestResponse({
      description: 'Invalid input (phone format, password strength, etc.)',
      schema: {
        allOf: [{ $ref: getSchemaPath(ErrorResponseDto) }],
        examples: {
          validationError: {
            summary: 'Validation error',
            value: {
              status: 'error',
              message: 'Phone must be a valid 11-digit Bangladesh number starting with 01',
              statusCode: 400,
              error: {
                details: {
                  phone: [
                    'Phone must be a valid 11-digit Bangladesh number starting with 01',
                  ],
                },
              },
            },
          },
        },
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid credentials or account not eligible for OTP resend',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (3 resends per 5 minutes)',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
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
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(AuthResponseDto),
              },
            },
          },
        ],
      },
    }),
    ApiBadRequestResponse({
      description:
        'Invalid credentials, account not verified, or missing email/phone',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiForbiddenResponse({
      description:
        'Account locked due to multiple failed attempts (5 attempts). Check message for unlock time.',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (10 attempts per 15 minutes per IP)',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
  ],

  'auth.refresh': [
    ApiOperation({
      summary: 'Refresh access token',
      description:
        'Get a new access token using refresh token. Refresh tokens are valid for 7 days. Pass refresh token in Authorization header as Bearer token.',
    }),
    ApiBearerAuth('Refresh-auth'),
    ApiOkResponse({
      description: 'New access token issued successfully',
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(TokenRefreshResponseDto),
              },
            },
          },
        ],
      },
    }),
    ApiBadRequestResponse({
      description: 'Refresh token is required in Authorization header',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiUnauthorizedResponse({
      description:
        'Invalid, expired, or revoked refresh token. Session not found.',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
    ApiTooManyRequestsResponse({
      description: 'Rate limit exceeded (20 requests per 5 minutes)',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
  ],

  'auth.logout': [
    ApiOperation({
      summary: 'Logout current session',
      description:
        'Revoke current refresh token session. Requires access JWT token in Authorization header.',
    }),
    ApiBearerAuth(),
    ApiOkResponse({
      description: 'Logged out successfully',
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: {
                type: 'object',
                properties: {
                  message: { type: 'string', example: 'Logged out successfully' },
                },
              },
            },
          },
        ],
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired access token',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
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
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: {
                type: 'object',
                properties: {
                  message: {
                    type: 'string',
                    example: 'All sessions logged out successfully',
                  },
                },
              },
            },
          },
        ],
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired access token',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
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
      schema: {
        allOf: [
          { $ref: getSchemaPath(SuccessResponseDto) },
          {
            properties: {
              data: {
                $ref: getSchemaPath(UserDto),
              },
            },
          },
        ],
      },
    }),
    ApiUnauthorizedResponse({
      description: 'Invalid or expired access token',
      schema: { $ref: getSchemaPath(ErrorResponseDto) },
    }),
  ],
};

Object.entries(docs).forEach(([key, value]) => registerSwaggerDocs(key, value));
