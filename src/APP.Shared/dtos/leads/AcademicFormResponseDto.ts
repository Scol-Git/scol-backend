import { ApiProperty } from '@nestjs/swagger';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { DegreeResponseDto } from './DegreeResponseDto';
import { EnglishTestResponseDto } from './EnglishTestResponseDto';
import { SelectableItemDto } from './SelectableItemDto';

/**
 * Response DTO for GET/PUT /api/leads/profile/academic-form
 * Contains all form data with validation rules and academic form completion status
 */
export class AcademicFormResponseDto {
  @ApiProperty({
    description: 'Academic form completion status (2-field: academic + English)',
    enum: AcademicFormStatus,
  })
  academicFormStatus!: AcademicFormStatus;

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
