import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { SearchRequestDto } from './SearchRequestDto';
import { SearchFiltersDto } from './SearchFiltersDto';
import { SearchRangesDto } from './SearchRangesDto';
import { SearchFlagsDto } from './SearchFlagsDto';

/**
 * Request DTO for POST /api/search/advanced
 *
 * Advanced search with filters, ranges, and flags.
 * Results are automatically ranked by internal algorithm
 * (eligibility + business ranking for logged-in users,
 * commission-based ranking for anonymous users).
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
}
