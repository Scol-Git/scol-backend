import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Single section score item in English test result (GET response).
 */
export class EnglishTestSectionItemDto {
  @ApiProperty({ description: 'Section ID', example: 'uuid-listening' })
  id!: string;

  @ApiPropertyOptional({
    description: 'Section display name (e.g. Listening, Reading)',
    example: 'Listening',
  })
  name?: string;

  @ApiPropertyOptional({
    description: 'User score for this section',
    example: 6.5,
    nullable: true,
  })
  score!: number | null;
}
