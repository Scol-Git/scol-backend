import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import type { Filter } from '@shared/models/Filter';

/**
 * Query DTO for paginated organization list with filtering and sorting.
 *
 * @example
 * GET /organizations?pageNumber=1&pageSize=10&sortColumns=name&sortDirections=asc
 *
 * POST /organizations/search (for complex filters)
 * Body: {
 *   "pageNumber": 1,
 *   "pageSize": 10,
 *   "filters": [
 *     { "propertyName": "name", "operator": "contains", "value": "Acme" }
 *   ]
 * }
 */
export class GetOrganizationsQueryDto {
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

  @ApiPropertyOptional({
    description: 'Dynamic filters to apply to the query',
    isArray: true,
    example: [
      { propertyName: 'name', operator: 'contains', value: 'Acme' },
      { propertyName: 'createdAt', operator: 'gte', value: '2024-01-01' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Object)
  filters?: Filter[];
}
