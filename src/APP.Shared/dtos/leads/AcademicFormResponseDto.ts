import { ApiProperty } from '@nestjs/swagger';
import { DegreeResponseDto } from './DegreeResponseDto';
import { EnglishTestResponseDto } from './EnglishTestResponseDto';
import { SelectableItemDto } from './SelectableItemDto';

/**
 * Response DTO for GET /api/leads/profile/academic-form
 * Contains all form data with validation rules
 */
export class AcademicFormResponseDto {
  @ApiProperty({
    description: 'All available degrees with user saved values',
    type: [DegreeResponseDto],
  })
  degrees!: DegreeResponseDto[];

  @ApiProperty({
    description: 'All available English tests with user saved values',
    type: [EnglishTestResponseDto],
  })
  englishTests!: EnglishTestResponseDto[];

  @ApiProperty({
    description: 'All countries with selection state',
    type: [SelectableItemDto],
  })
  preferredCountries!: SelectableItemDto[];

  @ApiProperty({
    description: 'All programmes with selection state',
    type: [SelectableItemDto],
  })
  preferredPrograms!: SelectableItemDto[];
}
