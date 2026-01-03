import {
  IsNotEmpty,
  IsString,
  Matches,
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
      'Phone must be a valid 11-digit Bangladesh number starting with 01, third digit must be 3-9 (operator code: 013, 014, 015, 016, 017, 018, 019)',
  })
  @AutoMap()
  @ApiProperty({
    description: 'Phone number (Bangladesh, 11 digits starting with 01, third digit 3-9: 013, 014, 015, 016, 017, 018, 019)',
    example: '01837917991',
  })
  phone!: string;
}

