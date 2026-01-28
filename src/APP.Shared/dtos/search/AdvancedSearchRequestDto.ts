import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsOptional, ValidateNested } from 'class-validator';
import { SearchRequestDto } from './SearchRequestDto';
import { SearchFiltersDto } from './SearchFiltersDto';
import { SearchRangesDto } from './SearchRangesDto';
import { SearchFlagsDto } from './SearchFlagsDto';
import { SortDto } from './SortDto';

/**
 * Request DTO for POST /api/search/advanced
 * Advanced search with full filters, ranges, flags, and sorting
 */
export class AdvancedSearchRequestDto extends SearchRequestDto {
  @ApiPropertyOptional({
    description: 'Filters',
    type: SearchFiltersDto,
  })
  @ValidateNested()
  @Type(() => SearchFiltersDto)
  @IsOptional()
  filters?: SearchFiltersDto;

  @ApiPropertyOptional({
    description: 'Range filters',
    type: SearchRangesDto,
  })
  @ValidateNested()
  @Type(() => SearchRangesDto)
  @IsOptional()
  ranges?: SearchRangesDto;

  @ApiPropertyOptional({
    description: 'Boolean flags',
    type: SearchFlagsDto,
  })
  @ValidateNested()
  @Type(() => SearchFlagsDto)
  @IsOptional()
  flags?: SearchFlagsDto;

  @ApiPropertyOptional({
    description: 'Sort configuration',
    type: [SortDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortDto)
  @IsOptional()
  sort?: SortDto[];
}
