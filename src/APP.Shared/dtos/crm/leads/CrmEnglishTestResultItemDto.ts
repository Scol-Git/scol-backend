import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnglishTestSectionItemDto } from '@shared/dtos/leads/EnglishTestSectionItemDto';
import { EnglishTestValidationDto } from '@shared/dtos/leads/EnglishTestValidationDto';

export class CrmEnglishTestResultItemDto {
  @ApiProperty({ format: 'uuid' })
  testId!: string;

  @ApiPropertyOptional({ example: 'IELTS' })
  testName?: string;

  @ApiPropertyOptional({ example: 6.5, nullable: true })
  overallScore!: number | null;

  @ApiPropertyOptional({ example: '2023-09-01', nullable: true })
  testDate!: string | null;

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiProperty({ type: [EnglishTestSectionItemDto] })
  sections!: EnglishTestSectionItemDto[];

  @ApiProperty({ type: EnglishTestValidationDto })
  validation!: EnglishTestValidationDto;
}
