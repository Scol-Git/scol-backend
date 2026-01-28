import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { CursorPaginationDto } from './CursorPaginationDto';
import { ListType } from '@shared/enums/ListType.enum';

/**
 * Request DTO for POST /api/home
 * Home page with infinite scroll, weighted ranking, no filters
 */
export class HomeRequestDto {
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
}
