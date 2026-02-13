import { ApiProperty } from '@nestjs/swagger';

/**
 * Filter option (id, name pair)
 */
export class FilterOptionDto {
  @ApiProperty({
    description: 'Filter option ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Filter option name',
    example: 'United States',
  })
  name!: string;
}

/**
 * Filter group (name + values)
 */
export class FilterGroupDto {
  @ApiProperty({
    description: 'Filter group name',
    example: 'country',
  })
  name!: string;

  @ApiProperty({
    description: 'Available filter options',
    type: [FilterOptionDto],
  })
  values!: FilterOptionDto[];
}

/**
 * Response for GET /search/advanced/filters
 */
export class AdvancedFiltersResponseDto {
  @ApiProperty({
    description: 'Available filter groups',
    type: [FilterGroupDto],
  })
  filters!: FilterGroupDto[];
}
