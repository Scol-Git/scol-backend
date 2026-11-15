import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { CursorPaginationDto } from '@shared/dtos/search/CursorPaginationDto';
import { ListType } from '@shared/enums/ListType.enum';
import { PublishStatus } from '@shared/enums/crm/PublishStatus.enum';
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

  @ApiPropertyOptional({
    description:
      'PUBLISHED (default, unchanged behaviour), DRAFT (unpublished intakes, includes past/odd intakes) or ALL',
    enum: PublishStatus,
    default: PublishStatus.PUBLISHED,
  })
  @IsEnum(PublishStatus)
  @IsOptional()
  publishStatus?: PublishStatus;

  @ApiPropertyOptional({ description: 'Only intakes owned by this bulk import batch' })
  @IsUUID()
  @IsOptional()
  importBatchId?: string;

  @ApiPropertyOptional({ description: 'Only intakes of this university' })
  @IsUUID()
  @IsOptional()
  uniId?: string;
}
