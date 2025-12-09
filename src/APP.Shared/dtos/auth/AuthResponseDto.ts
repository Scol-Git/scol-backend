import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Auth Response DTO
 *
 * Response after successful authentication (login or OTP verification).
 * Contains access token, refresh token, and user information.
 */
export class AuthResponseDto {
  /**
   * User ID (UUID)
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @ApiProperty({
    description: 'User ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @AutoMap()
  userId!: string;

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
