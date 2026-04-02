import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Lead registration request DTO
 */
export class RegisterLeadRequestDto {
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
  @AutoMap()
  @ApiProperty({
    description:
      'Password with min 8 chars, must include upper, lower, number, special',
    example: 'SecureP@ss123',
    minLength: 8,
  })
  password!: string;

  /**
   * Full name of the lead
   * @example "John Doe"
   */
  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @MinLength(2, { message: 'Full name must be at least 2 characters long' })
  @MaxLength(255, { message: 'Full name must not exceed 255 characters' })
  @AutoMap()
  @ApiProperty({
    description: 'Full name of the lead',
    example: 'John Doe',
    minLength: 2,
    maxLength: 255,
  })
  fullName!: string;
}

