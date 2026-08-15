import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CursorPaginationDto } from '@shared/dtos/search/CursorPaginationDto';
import { ListType } from '@shared/enums/ListType.enum';
import { SearchFiltersDto } from '@shared/dtos/search/SearchFiltersDto';
import { SearchRangesDto } from '@shared/dtos/search/SearchRangesDto';
import { SearchFlagsDto } from '@shared/dtos/search/SearchFlagsDto';

/**
 * Request DTO for POST /crm/search
 * Combined CRM search: text, filters, ranges, and flags.
 */
export class CrmCourseSearchRequestDto {
  @ApiPropertyOptional({
    description: 'Cursor pagination',
    type: CursorPaginationDto,
  })
  @ValidateNested()
  @Type(() => CursorPaginationDto)
  @IsOptional()
  pagination?: CursorPaginationDto;

  @ApiPropertyOptional({
    description: 'Search text (course name, university, country)',
    example: 'MBA Canada',
  })
  @IsString()
  @IsOptional()
  searchText?: string;

  @ApiPropertyOptional({
    description: 'List type filter',
    enum: ListType,
    default: ListType.ELIGIBLE_ONLY,
  })
  @IsEnum(ListType)
  @IsOptional()
  listType?: ListType | null = null;

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
