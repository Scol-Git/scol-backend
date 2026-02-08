import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { CursorPaginationDto } from './CursorPaginationDto';
import { ListType } from '@shared/enums/ListType.enum';
import { SearchFiltersDto } from './SearchFiltersDto';
import { SearchRangesDto } from './SearchRangesDto';
import { SearchFlagsDto } from './SearchFlagsDto';

/**
 * Request DTO for POST /api/search/advanced
 * Advanced search: filters, ranges, flags. No searchText.
 */
export class AdvancedSearchRequestDto {
  @ApiPropertyOptional({
    description: 'Cursor pagination',
    type: CursorPaginationDto,
  })
  @ValidateNested()
  @Type(() => CursorPaginationDto)
  @IsOptional()
  pagination?: CursorPaginationDto;

  @ApiPropertyOptional({
    description: 'List type filter',
    enum: ListType,
    default: ListType.ELIGIBLE_ONLY,
  })
  @IsEnum(ListType)
  @IsOptional()
  listType?: ListType = ListType.ELIGIBLE_ONLY;

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
