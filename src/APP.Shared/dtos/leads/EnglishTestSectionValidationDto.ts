import { ApiProperty } from '@nestjs/swagger';

/**
 * Validation rules for a single section of an English test.
 */
export class EnglishTestSectionValidationDto {
  @ApiProperty({
    description: 'Section ID',
    example: 'uuid-listening',
  })
  id!: string;

  @ApiProperty({
    description: 'Section name',
    example: 'Listening',
  })
  name!: string;

  @ApiProperty({
    description: 'Maximum score for this section',
    example: 9,
  })
  maxScore!: number;
}
