import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { CursorPaginationDto } from './CursorPaginationDto';
import { ListType } from '@shared/enums/ListType.enum';

/**
 * Request DTO for POST /api/search
 * Normal search with text search
 */
export class SearchRequestDto {
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
}
