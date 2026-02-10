import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';
import { AuthResponseUserDto } from './AuthResponseUserDto';

/**
 * Auth Response DTO
 *
 * Response after successful authentication (login, OTP verification, or reset-password verification).
 * Contains user (userId + academicFormStatus), access token, and refresh token.
 */
export class AuthResponseDto {
  /**
   * User info (userId and academic form status for onboarding/eligibility UI)
   */
  @ApiProperty({
    description: 'User (userId and academic form status)',
    type: AuthResponseUserDto,
  })
  @AutoMap()
  user!: AuthResponseUserDto;

  /**
   * Access token (JWT)
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  @ApiProperty({
    description: 'Access token (JWT)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @AutoMap()
  accessToken!: string;

  /**
   * Refresh token (JWT)
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  @ApiProperty({
    description: 'Refresh token (JWT)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @AutoMap()
  refreshToken!: string;
}
