import {
  IsString,
  IsNotEmpty,
  MinLength,
  Matches,
  MaxLength,
} from 'class-validator';
import { AutoMap } from '@automapper/classes';

/**
 * Register Lead Request DTO
 *
 * Request payload for lead/student self-registration.
 * Only leads can self-register; other user types are created by admins.
 */
export class RegisterLeadRequestDto {
  /**
   * Phone number (Bangladesh format: 11 digits starting with 01)
   * @example "01837917991"
   */
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^01[0-9]{9}$/, {
    message:
      'Phone must be a valid 11-digit Bangladesh number starting with 01',
  })
  @AutoMap()
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
  fullName!: string;
}
