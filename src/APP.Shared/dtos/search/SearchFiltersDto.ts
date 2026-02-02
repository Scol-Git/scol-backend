import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsNumber, IsArray, IsOptional } from 'class-validator';

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
    description: 'Filter by intake IDs',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  intakeIds?: string[];

  @ApiPropertyOptional({
    description: 'Filter by intake year',
    example: 2026,
  })
  @IsNumber()
  @IsOptional()
  intakeYear?: number;
}
