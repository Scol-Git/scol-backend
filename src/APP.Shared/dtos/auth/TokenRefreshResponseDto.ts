import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Token Refresh Response DTO
 *
 * Response after successfully refreshing access token.
 */
export class TokenRefreshResponseDto {
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
