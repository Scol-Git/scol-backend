import { IsString, IsNotEmpty } from 'class-validator';
import { AutoMap } from '@automapper/classes';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Refresh Token Request DTO
 *
 * Request payload for refreshing access token.
 */
export class RefreshTokenRequestDto {
  /**
   * Refresh token
   * @example "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   */
  @IsString()
  @IsNotEmpty({ message: 'Refresh token is required' })
  @ApiProperty({
    description: 'Refresh token (JWT)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @AutoMap()
  refreshToken!: string;
}
