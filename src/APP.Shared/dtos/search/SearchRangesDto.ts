import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, ValidateNested, Min } from 'class-validator';

/**
 * Range filter with min/max values
 */
export class RangeDto {
  @ApiPropertyOptional({ description: 'Minimum value', example: 10000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  min?: number;

  @ApiPropertyOptional({ description: 'Maximum value', example: 100000 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  max?: number;
}

/**
 * Range filters for search
 */
export class SearchRangesDto {
  @ApiPropertyOptional({
    description: 'Tuition fee range',
    type: RangeDto,
  })
  @ValidateNested()
  @Type(() => RangeDto)
  @IsOptional()
  tuitionFee?: RangeDto;

  @ApiPropertyOptional({
    description: 'Duration in months range',
    type: RangeDto,
  })
  @ValidateNested()
  @Type(() => RangeDto)
  @IsOptional()
  durationMonths?: RangeDto;
}
