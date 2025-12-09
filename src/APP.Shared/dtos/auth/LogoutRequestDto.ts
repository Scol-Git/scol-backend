import { IsOptional, IsUUID } from 'class-validator';
import { AutoMap } from '@automapper/classes';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Logout Request DTO
 *
 * Optional request payload for logout.
 * If sessionId is provided, only that session will be logged out.
 * Otherwise, the current session will be logged out.
 */
export class LogoutRequestDto {
  /**
   * Session ID to logout (optional)
   * If not provided, current session will be logged out
   * @example "123e4567-e89b-12d3-a456-426614174000"
   */
  @IsOptional()
  @IsUUID('4', { message: 'Session ID must be a valid UUID' })
  @ApiPropertyOptional({
    description: 'Session ID to logout (optional); defaults to current session',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @AutoMap()
  sessionId?: string;
}
