import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnglishTestSectionItemDto } from './EnglishTestSectionItemDto';

/**
 * Single English test result item in GET /leads/profile/academic-form response.
 * One per user-saved test. Value fields null when missing; filled booleans indicate valid stored value.
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
    description: 'True when overallScore is present and valid (e.g. > 0 and <= test max)',
    example: true,
  })
  overallScoreFilled!: boolean;

  @ApiProperty({
    description: 'True when testDate is present',
    example: true,
  })
  testDateFilled!: boolean;

  @ApiProperty({
    description: 'Section scores',
    type: [EnglishTestSectionItemDto],
  })
  sections!: EnglishTestSectionItemDto[];
}
