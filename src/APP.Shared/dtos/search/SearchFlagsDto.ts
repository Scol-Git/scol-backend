import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

/**
 * Boolean flags for search filtering
 */
export class SearchFlagsDto {
  @ApiPropertyOptional({
    description: 'Only show courses with scholarships',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  hasScholarship?: boolean;
}
