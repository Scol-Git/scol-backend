import { ApiProperty } from '@nestjs/swagger';
import { EnglishTestSectionValidationDto } from './EnglishTestSectionValidationDto';

/**
 * Validation rules for an English test.
 */
export class EnglishTestValidationDto {
  @ApiProperty({
    description: 'Maximum overall score',
    example: 9,
  })
  maxScore!: number;

  @ApiProperty({
    description: 'Available sections with their max scores',
    type: [EnglishTestSectionValidationDto],
  })
  sections!: EnglishTestSectionValidationDto[];
}
