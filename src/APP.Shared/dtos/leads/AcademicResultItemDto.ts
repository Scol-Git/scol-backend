import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DegreeValidationDto } from './DegreeValidationDto';

/**
 * Single academic result item in GET /leads/profile/academic-form response.
 * One per system degree (levelOrder 1-4). Value fields null when not filled.
 */
export class AcademicResultItemDto {
  @ApiProperty({ description: 'Degree ID', example: 'uuid-ssc' })
  degreeId!: string;

  @ApiPropertyOptional({
    description: 'Degree display name (e.g. SSC, HSC)',
    example: 'SSC',
  })
  degreeName?: string;

  @ApiPropertyOptional({
    description: 'User GPA for this degree',
    example: 4.5,
    nullable: true,
  })
  gpa!: number | null;

  @ApiPropertyOptional({
    description: 'Institute name',
    example: 'ABC School',
    nullable: true,
  })
  institute!: string | null;

  @ApiPropertyOptional({
    description: 'Passing date (ISO YYYY-MM-DD)',
    example: '2018-06-01',
    nullable: true,
  })
  passingDate!: string | null;

  @ApiProperty({
    description:
      'True when this row can be edited (no valid GPA yet). False when gpa is set and non-zero.',
    example: true,
  })
  isEditable!: boolean;

  @ApiProperty({
    description: 'Validation rules for this degree (e.g. max GPA scale)',
    type: DegreeValidationDto,
  })
  validation!: DegreeValidationDto;
}
