import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsNumber,
  IsDateString,
  IsOptional,
  Min,
  Max,
  ValidateNested,
  IsArray,
} from 'class-validator';

/**
 * Input DTO for a single section score
 */
export class EnglishTestSectionInputDto {
  @ApiProperty({ description: 'Section ID', example: 'uuid-listening' })
  @IsUUID()
  sectionId!: string;

  @ApiProperty({ description: 'Section score', example: 6.5 })
  @IsNumber()
  @Min(0)
  @Max(120) // TOEFL can have higher section scores
  score!: number;
}

/**
 * Input DTO for a single English test result
 */
export class EnglishTestInputDto {
  @ApiProperty({ description: 'Test ID', example: 'uuid-ielts' })
  @IsUUID()
  testId!: string;

  @ApiProperty({ description: 'Overall score', example: 7 })
  @IsNumber()
  @Min(0)
  @Max(120) // TOEFL can be up to 120
  overallScore!: number;

  @ApiPropertyOptional({
    description: 'Test date (ISO format)',
    example: '2023-09-01',
  })
  @IsDateString()
  @IsOptional()
  testDate?: string;

  @ApiPropertyOptional({
    description: 'Section scores',
    type: [EnglishTestSectionInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnglishTestSectionInputDto)
  @IsOptional()
  sections?: EnglishTestSectionInputDto[];
}
