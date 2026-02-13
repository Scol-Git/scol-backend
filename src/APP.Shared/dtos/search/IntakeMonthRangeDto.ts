import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min, Max } from 'class-validator';

/**
 * Intake month range filter for advanced search
 * All fields are optional - filter only applies when all three are provided
 */
export class IntakeMonthRangeDto {
  @ApiPropertyOptional({
    description: 'Intake year',
    example: 2026,
  })
  @IsNumber()
  @IsOptional()
  year?: number | null;

  @ApiPropertyOptional({
    description: 'Starting month (1-12)',
    example: 2,
    minimum: 1,
    maximum: 12,
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  fromMonth?: number | null;

  @ApiPropertyOptional({
    description: 'Ending month (1-12)',
    example: 6,
    minimum: 1,
    maximum: 12,
  })
  @IsNumber()
  @Min(1)
  @Max(12)
  @IsOptional()
  toMonth?: number | null;
}
