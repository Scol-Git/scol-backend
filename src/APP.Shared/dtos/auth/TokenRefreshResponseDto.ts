import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';
import { AuthResponseUserDto } from './AuthResponseUserDto';

/**
 * Token Refresh Response DTO
 *
 * Response after successfully refreshing access token.
 * Includes user (userId + academicFormStatus) so the client can keep UI in sync without re-login.
 */
export class TokenRefreshResponseDto {
  /**
   * User info (userId and academic form status)
   */
  @ApiProperty({
    description: 'User (userId and academic form status)',
    type: AuthResponseUserDto,
  })
  @AutoMap()
  user!: AuthResponseUserDto;

  /**
   * New access token (JWT)
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  @ApiProperty({
    description: 'New access token (JWT)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @AutoMap()
  accessToken!: string;
}
