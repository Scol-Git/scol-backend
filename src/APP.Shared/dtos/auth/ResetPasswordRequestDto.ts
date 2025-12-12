import {
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Reset Password Request DTO
 *
 * Request payload for resetting password after OTP verification.
 * Requires password reset token in Authorization header (obtained after OTP verification).
 */
export class ResetPasswordRequestDto {
  /**
   * New password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)
   * @example "NewSecureP@ss123"
   */
  @IsString()
  @IsNotEmpty({ message: 'New password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @AutoMap()
  @ApiProperty({
    description:
      'New password with min 8 chars, must include upper, lower, number, special',
    example: 'NewSecureP@ss123',
    minLength: 8,
  })
  newPassword!: string;

  /**
   * Confirm password (must match new password)
   * @example "NewSecureP@ss123"
   */
  @IsString()
  @IsNotEmpty({ message: 'Confirm password is required' })
  @AutoMap()
  @ApiProperty({
    description: 'Confirm password (must match new password)',
    example: 'NewSecureP@ss123',
    minLength: 8,
  })
  confirmPassword!: string;
}

