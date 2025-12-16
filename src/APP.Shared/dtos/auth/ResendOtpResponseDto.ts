import { AutoMap } from '@automapper/classes';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Resend OTP Response DTO
 *
 * Response returned after successfully resending an OTP.
 * Does NOT contain any access token or authentication data.
 */
export class ResendOtpResponseDto {
  /**
   * Success message
   * @example "OTP sent successfully"
   */
  @ApiProperty({
    description: 'Success message indicating OTP was resent successfully',
    example: 'OTP sent successfully',
  })
  @AutoMap()
  message!: string;

  /**
   * OTP code (development only)
   * NEVER present in production environments
   *
   * @example "123456"
   */
  @ApiPropertyOptional({
    description: 'OTP code (development only, never returned in production)',
    example: '123456',
  })
  @AutoMap()
  devOtp?: string;

  /**
   * Retry-after time in seconds
   * Client must wait this duration before requesting another OTP
   *
   * @example 60
   */
  @ApiProperty({
    description:
      'Retry-after time in seconds before another OTP resend can be requested',
    example: 60,
  })
  @AutoMap()
  retryAfter!: number;
}
