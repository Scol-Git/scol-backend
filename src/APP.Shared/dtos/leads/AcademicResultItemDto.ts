import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Single academic result item in GET /leads/profile/academic-form response.
 * One per user-saved degree (levelOrder 1-4 only). Value fields null when missing; filled booleans indicate valid stored value.
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
    description: 'True when gpa is present and valid (e.g. > 0 and <= gpaScale)',
    example: true,
  })
  gpaFilled!: boolean;

  @ApiProperty({
    description: 'True when institute is present and non-empty',
    example: true,
  })
  instituteFilled!: boolean;

  @ApiProperty({
    description: 'True when passingDate is present',
    example: true,
  })
  passingDateFilled!: boolean;
}
