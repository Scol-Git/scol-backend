import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnglishTestSectionItemDto } from './EnglishTestSectionItemDto';
import { EnglishTestValidationDto } from './EnglishTestValidationDto';

/**
 * Single English test result item in GET /leads/profile/academic-form response.
 * One per system English test. Value fields null when not filled.
 */
export class EnglishTestResultItemDto {
  @ApiProperty({ description: 'Test ID', example: 'uuid-ielts' })
  testId!: string;

  @ApiPropertyOptional({
    description: 'Test display name (e.g. IELTS, TOEFL)',
    example: 'IELTS',
  })
  testName?: string;

  @ApiPropertyOptional({
    description: 'User overall score',
    example: 7,
    nullable: true,
  })
  overallScore!: number | null;

  @ApiPropertyOptional({
    description: 'Test date (ISO YYYY-MM-DD)',
    example: '2023-09-01',
    nullable: true,
  })
  testDate!: string | null;

  @ApiProperty({
    description:
      'True when this test can be edited. False only when overallScore and every section score are set and non-zero.',
    example: true,
  })
  isEditable!: boolean;

  @ApiProperty({
    description: 'Section scores',
    type: [EnglishTestSectionItemDto],
  })
  sections!: EnglishTestSectionItemDto[];

  @ApiProperty({
    description:
      'Validation rules for this test (max overall score, section max scores)',
    type: EnglishTestValidationDto,
  })
  validation!: EnglishTestValidationDto;
}
