import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Validation rules for a degree
 */
export class DegreeValidationDto {
  @ApiProperty({ description: 'Maximum GPA scale for this degree', example: 5 })
  gpaScale!: number;
}

/**
 * Degree information with user's saved values and validation rules
 */
export class DegreeResponseDto {
  @ApiProperty({ description: 'Degree ID', example: 'uuid-ssc' })
  degreeId!: string;

  @ApiProperty({ description: 'Degree name', example: 'SSC' })
  name!: string;

  @ApiPropertyOptional({ description: 'User GPA for this degree', example: 4.5 })
  gpa?: number;

  @ApiPropertyOptional({
    description: 'Institute name',
    example: 'ABC School',
  })
  institute?: string;

  @ApiPropertyOptional({
    description: 'Passing date',
    example: '2018-06-01',
  })
  passingDate?: string;

  @ApiProperty({ description: 'Validation rules for this degree' })
  validation!: DegreeValidationDto;
}
