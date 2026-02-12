import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IntakeMonthRangeDto } from './IntakeMonthRangeDto';

/**
 * Filters for search/advanced search
 */
export class SearchFiltersDto {
  @ApiPropertyOptional({
    description: 'Filter by country IDs',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  countryIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by city IDs',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  cityIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by programme IDs',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  programmeIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by intake month range (year, fromMonth, toMonth)',
    type: IntakeMonthRangeDto,
  })
  @ValidateNested()
  @Type(() => IntakeMonthRangeDto)
  @IsOptional()
  intake?: IntakeMonthRangeDto | null;
}
