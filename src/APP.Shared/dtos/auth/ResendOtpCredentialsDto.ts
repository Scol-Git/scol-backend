import { IsNotEmpty, IsString, Matches, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Resend OTP using credentials DTO
 */
export class ResendOtpCredentialsDto {
  /**
   * Phone number (Bangladesh format: 11 digits starting with 01)
   * @example "01837917991"
   */
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^01[0-9]{9}$/, {
    message: 'Phone must be a valid 11-digit Bangladesh number starting with 01',
  })
  @ApiProperty({
    description: 'Phone number (Bangladesh, 11 digits starting with 01)',
    example: '01837917991',
  })
  phone!: string;

  /**
   * User password (minimum 8 characters, must contain uppercase, lowercase, number, and special character)
   * @example "SecureP@ss123"
   */
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, {
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  @ApiProperty({
    description:
      'Password with min 8 chars, must include upper, lower, number, special',
    example: 'SecureP@ss123',
    minLength: 8,
  })
  password!: string;
}

