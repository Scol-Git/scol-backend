import { IsNotEmpty, IsString, Length } from 'class-validator';
import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Verify OTP V2 DTO
 *
 * Request payload for verifying phone OTP when the OTP JWT is sent in the body
 * instead of the Authorization header.
 */
export class VerifyOtpV2RequestDto {
  /**
   * 6-digit OTP code received via SMS
   * @example "123456"
   */
  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @AutoMap()
  @ApiProperty({
    description: '6-digit OTP code received via SMS',
    example: '123456',
  })
  otp!: string;

  /**
   * OTP verification JWT token (short-lived, aud=otp)
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  @IsString()
  @IsNotEmpty({ message: 'OTP access token is required' })
  @AutoMap()
  @ApiProperty({
    description:
      'OTP verification JWT token (short-lived, aud=otp). Issued by register or forgot-password.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  otpAccessToken!: string;
}
