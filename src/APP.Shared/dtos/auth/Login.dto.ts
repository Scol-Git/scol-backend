import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  ValidateIf,
} from 'class-validator';
import { AutoMap } from '@automapper/classes';

/**
 * Login Request DTO
 *
 * Request payload for user login.
 * - Leads login with phone + password
 * - Other users (Admin, Counselor, Agent) login with email + password
 *
 * Either email or phone is required, but not both.
 */
export class LoginRequestDto {
  /**
   * Email address (for non-lead users)
   * @example "admin@scol.com"
   */
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  @ValidateIf((o) => !o.phone || o.email)
  @AutoMap()
  email?: string;

  /**
   * Phone number (for lead users - Bangladesh format: 11 digits starting with 01)
   * @example "01837917991"
   */
  @IsOptional()
  @IsString()
  @ValidateIf((o) => !o.email || o.phone)
  @AutoMap()
  phone?: string;

  /**
   * User password
   * @example "SecureP@ss123"
   */
  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @AutoMap()
  password!: string;
}
