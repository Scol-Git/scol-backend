import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Register Lead Response DTO
 *
 * Response after successful registration or OTP resend.
 * Contains a short-lived OTP verification token.
 */
export class RegisterLeadResponseDto {
  /**
   * OTP verification JWT token (short-lived, aud=otp, purpose=phone_verify)
   * Use this token in Authorization header for /verify-otp and /resend-otp endpoints
   */
  @ApiProperty({
    description:
      'OTP verification JWT token (short-lived, aud=otp, purpose=phone_verify)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @AutoMap()
  otpAccessToken!: string;

  /**
   * Token expiration time in seconds
   * @example 300
   */
  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 300,
  })
  @AutoMap()
  expiresIn!: number;

  /**
   * Success message
   * @example "OTP sent successfully. Please verify your phone."
   */
  @ApiProperty({
    description: 'Success message',
    example: 'OTP sent successfully. Please verify your phone.',
  })
  @AutoMap()
  message!: string;

  /**
   * OTP code (only in development mode for testing)
   * NEVER present in production
   * @example "123456"
   */
  @ApiPropertyOptional({
    description: 'OTP code (development only, never in production responses)',
    example: '123456',
  })
  @AutoMap()
  devOtp?: string;

  /**
   * Retry after time in seconds
   * Wait this many seconds before requesting a new OTP
   * @example 60
   */
  @ApiProperty({
    description: 'Retry after time in seconds. Wait this long before requesting a new OTP.',
    example: 60,
  })
  @AutoMap()
  retryAfter!: number;
}

