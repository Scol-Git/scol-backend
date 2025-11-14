import { IsOptional, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Simple query DTO for GET /organizations endpoint.
 * Supports pagination and sorting only (no complex filters).
 *
 * For advanced filtering, use POST /organizations/search instead.
 *
 * @example
 * GET /organizations?pageNumber=1&pageSize=10&sortColumns=name&sortDirections=asc
 */
export class ListOrganizationsQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Page number (1-based)',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageNumber?: number = 1;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Number of items per page',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 10;

  @ApiPropertyOptional({
    default: 'createdAt',
    description: 'Comma-separated column names to sort by',
    example: 'name,createdAt',
  })
  @IsOptional()
  @IsString()
  sortColumns?: string = 'createdAt';

  @ApiPropertyOptional({
    default: 'desc',
    description: 'Comma-separated sort directions (asc/desc)',
    example: 'asc,desc',
  })
  @IsOptional()
  @IsString()
  sortDirections?: string = 'desc';
}
