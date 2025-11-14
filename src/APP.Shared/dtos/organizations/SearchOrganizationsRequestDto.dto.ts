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
import { Filter } from '@shared/models/Filter';

/**
 * Advanced search DTO for organizations with dynamic filtering.
 * Used in POST /organizations/search endpoint.
 *
 * @example
 * POST /organizations/search
 * Body: {
 *   "pageNumber": 1,
 *   "pageSize": 10,
 *   "sortColumns": "name",
 *   "sortDirections": "asc",
 *   "filters": [
 *     { "propertyName": "name", "operator": "contains", "value": "Acme" },
 *     { "propertyName": "createdAt", "operator": "gte", "value": "2024-01-01" }
 *   ]
 * }
 */
export class SearchOrganizationsRequestDto {
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

  /**
   * Dynamic filters array for complex search criteria.
   * Each filter specifies a property, operator, and value.
   */
  @ApiPropertyOptional({
    description: 'Dynamic filters to apply to the search',
    type: [Filter],
    example: [
      { propertyName: 'name', operator: 'contains', value: 'Acme' },
      { propertyName: 'createdAt', operator: 'gte', value: '2024-01-01' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Filter)
  filters?: Filter[];
}
