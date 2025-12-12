import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Password Reset Token Response DTO
 *
 * Response after successful OTP verification for password reset.
 * Contains a short-lived password reset token.
 */
export class PasswordResetTokenResponseDto {
  /**
   * Password reset JWT token (short-lived, aud=otp, purpose=password_reset)
   * Use this token in Authorization header for /reset-password endpoint
   */
  @ApiProperty({
    description:
      'Password reset JWT token (short-lived, aud=otp, purpose=password_reset)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @AutoMap()
  passwordResetToken!: string;

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
   * @example "OTP verified successfully. You can now reset your password."
   */
  @ApiProperty({
    description: 'Success message',
    example: 'OTP verified successfully. You can now reset your password.',
  })
  @AutoMap()
  message!: string;
}

