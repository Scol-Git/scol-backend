import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * Cursor-based pagination request
 */
export class CursorPaginationDto {
  @ApiPropertyOptional({
    description: 'Cursor for pagination (from previous response)',
    example: 'eyJyYW5rU2NvcmUiOjk1MDAuLi4',
  })
  @IsString()
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 15,
    default: 15,
    minimum: 1,
    maximum: 50,
  })
  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  limit?: number = 15;
}

/**
 * Cursor-based pagination response
 */
export class CursorPaginationResponseDto {
  cursor!: string | null;
  limit!: number;
  hasNext!: boolean;
}
