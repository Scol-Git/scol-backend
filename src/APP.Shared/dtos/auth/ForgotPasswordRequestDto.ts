import {
  IsNotEmpty,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Forgot Password Request DTO
 *
 * Request payload for initiating password reset flow.
 * User provides phone number to receive OTP for password reset.
 */
export class ForgotPasswordRequestDto {
  /**
   * Phone number (Bangladesh format: 11 digits starting with 01)
   * Third digit: 3-9 (operator code)
   * Valid prefixes: 013, 014, 015, 016, 017, 018, 019
   * @example "01837917991"
   */
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^01[3-9]\d{8}$/, {
    message:
      'Invalid Bangladesh phone number format',
  })
  @AutoMap()
  @ApiProperty({
    description: 'Phone number (Bangladesh, 11 digits starting with 01, third digit 3-9: 013, 014, 015, 016, 017, 018, 019)',
    example: '01837917991',
  })
  phone!: string;

  /**
   * New password to set after OTP verification
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
}

