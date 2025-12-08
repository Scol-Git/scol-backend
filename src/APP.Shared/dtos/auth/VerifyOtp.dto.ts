import { IsString, IsNotEmpty, Length } from 'class-validator';
import { AutoMap } from '@automapper/classes';

/**
 * Verify OTP DTO
 *
 * Request payload for verifying phone OTP after registration.
 * Phone number is extracted from the OTP JWT token in the Authorization header.
 */
export class VerifyOtpDto {
  /**
   * 6-digit OTP code received via SMS
   * @example "123456"
   */
  @IsString()
  @IsNotEmpty({ message: 'OTP is required' })
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @AutoMap()
  otp!: string;
}

