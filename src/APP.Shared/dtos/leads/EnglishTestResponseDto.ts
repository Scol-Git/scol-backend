import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Section score for an English test
 */
export class EnglishTestSectionScoreDto {
  @ApiProperty({ description: 'Section ID', example: 'uuid-listening' })
  id!: string;

  @ApiProperty({ description: 'Section name', example: 'Listening' })
  name!: string;

  @ApiPropertyOptional({ description: 'User score for this section', example: 9 })
  score?: number;
}

/**
 * Section validation info
 */
export class EnglishTestSectionValidationDto {
  @ApiProperty({ description: 'Section ID', example: 'uuid-listening' })
  id!: string;

  @ApiProperty({ description: 'Section name', example: 'Listening' })
  name!: string;

  @ApiProperty({ description: 'Maximum score for this section', example: 9 })
  maxScore!: number;
}

/**
 * Validation rules for an English test
 */
export class EnglishTestValidationDto {
  @ApiProperty({ description: 'Maximum overall score', example: 9 })
  maxScore!: number;

  @ApiProperty({
    description: 'Available sections with their max scores',
    type: [EnglishTestSectionValidationDto],
  })
  sections!: EnglishTestSectionValidationDto[];
}

/**
 * English test information with user's saved values and validation rules
 */
export class EnglishTestResponseDto {
  @ApiProperty({ description: 'Test ID', example: 'uuid-ielts' })
  testId!: string;

  @ApiProperty({ description: 'Test name', example: 'IELTS' })
  testName!: string;

  @ApiPropertyOptional({ description: 'User overall score', example: 7 })
  overallScore?: number;

  @ApiPropertyOptional({ description: 'Test date', example: '2023-09-01' })
  testDate?: string;

  @ApiProperty({
    description: 'Section scores',
    type: [EnglishTestSectionScoreDto],
  })
  sections!: EnglishTestSectionScoreDto[];

  @ApiProperty({ description: 'Validation rules for this test' })
  validation!: EnglishTestValidationDto;
}
