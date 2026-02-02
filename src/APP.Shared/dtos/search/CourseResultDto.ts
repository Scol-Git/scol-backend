import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * University information in search results
 */
export class UniversityDto {
  @ApiProperty({ description: 'University ID' })
  id!: string;

  @ApiProperty({ description: 'University name' })
  name!: string;

  @ApiProperty({ description: 'Country name' })
  country!: string;

  @ApiPropertyOptional({ description: 'State/Province name' })
  state?: string;

  @ApiPropertyOptional({ description: 'City name' })
  city?: string;

  @ApiPropertyOptional({ description: 'University logo URL' })
  logoUrl?: string;

  @ApiPropertyOptional({ description: 'University image URL' })
  imgUrl?: string;
}

/**
 * Intake information in search results
 */
export class IntakeDto {
  @ApiProperty({ description: 'Intake name', example: 'JAN 2026' })
  name!: string;

  @ApiProperty({ description: 'Intake year', example: 2026 })
  year!: number;
}

/**
 * English requirement in search results
 */
export class EnglishRequirementDto {
  @ApiProperty({ description: 'English test name', example: 'IELTS' })
  testName!: string;

  @ApiProperty({ description: 'Overall score requirement', example: 5.5 })
  overall!: number;

  @ApiPropertyOptional({
    description: 'Section score requirement',
    example: 5.5,
  })
  section?: number;
}

/**
 * Course result in search response
 */
export class CourseResultDto {
  @ApiProperty({ description: 'Course intake ID' })
  courseId!: string;

  @ApiProperty({ description: 'Course name' })
  courseName!: string;

  @ApiProperty({ description: 'University information' })
  university!: UniversityDto;

  @ApiPropertyOptional({ description: 'Course image URL' })
  imgUrl?: string;

  @ApiProperty({ description: 'Intake information' })
  intake!: IntakeDto;

  @ApiPropertyOptional({ description: 'Tuition fee' })
  tuitionFee?: number;

  @ApiPropertyOptional({ description: 'Currency code', example: 'USD' })
  currency?: string;

  @ApiPropertyOptional({ description: 'Duration in months' })
  durationMonths?: number;

  @ApiPropertyOptional({ description: 'Initial deposit amount' })
  initialDeposit?: number;

  @ApiPropertyOptional({ description: 'Application fee' })
  applicationFee?: number;

  @ApiProperty({ description: 'Whether scholarship is available' })
  isScholarshipAvailable!: boolean;

  @ApiPropertyOptional({ description: 'English requirements' })
  engRequirements?: EnglishRequirementDto[];

  @ApiProperty({ description: 'Whether course is wishlisted by user' })
  isWishlisted!: boolean;
}
