import { IsNotEmpty, IsString } from 'class-validator';
import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Resend OTP V2 DTO
 *
 * Request payload for resending OTP when the OTP JWT is sent in the body
 * instead of the Authorization header.
 */
export class ResendOtpV2RequestDto {
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
