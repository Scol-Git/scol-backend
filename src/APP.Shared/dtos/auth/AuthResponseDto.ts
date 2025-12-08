import { AutoMap } from '@automapper/classes';
import { UserDto } from './UserDto';

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
  @AutoMap()
  userId!: string;

  /**
   * Access token (JWT)
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  @AutoMap()
  accessToken!: string;

  /**
   * Refresh token (JWT)
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  @AutoMap()
  refreshToken!: string;

  /**
   * Access token expiration time in seconds
   * @example 900
   */
  @AutoMap()
  expiresIn!: number;
}
