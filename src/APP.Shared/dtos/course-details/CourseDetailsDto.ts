import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RankingDto {
  @ApiPropertyOptional() position?: number | null;
  @ApiProperty() hasInfo!: boolean;
  @ApiProperty() infoKey!: string;
}

export class UniversityDetailsDto {
  @ApiProperty() uniId!: string;
  @ApiProperty() uniName!: string;
  @ApiPropertyOptional() uniLogoUrl?: string | null;
  @ApiPropertyOptional() uniCoverImageUrl?: string | null;
}

export class LocationCoordinatesDto {
  @ApiPropertyOptional() latitude?: number;
  @ApiPropertyOptional() longitude?: number;
  /** Map URL from `locationMapMetaData.href` (or `link` when stored). */
  @ApiPropertyOptional() link?: string | null;
}

export class LocationDto {
  @ApiPropertyOptional() city?: string | null;
  @ApiPropertyOptional() country?: string | null;
  @ApiPropertyOptional() state?: string | null;
  @ApiPropertyOptional() address?: string | null;
  @ApiPropertyOptional({ type: LocationCoordinatesDto })
  coordinates?: LocationCoordinatesDto | null;
}

export class CourseTagDto {
  @ApiProperty() label!: string;
  @ApiProperty({
    description: 'Tag category: established | type | location',
  })
  type!: string;
}

export class CourseTabDto {
  @ApiProperty() key!: string;
  @ApiProperty() label!: string;
}

export class DegreeRequirementItemDto {
  @ApiProperty() degreeName!: string;
  @ApiProperty({ example: 'GPA | CGPA' }) label!: string;
  @ApiProperty() minValue!: string;
}

export class EnglishRequirementItemDto {
  @ApiProperty() testName!: string;
  @ApiProperty() minOverallValue!: string;
  @ApiProperty() minSectionValue!: string;
}

export class AcademicRequirementsContentDto {
  @ApiProperty({ type: [DegreeRequirementItemDto] })
  degreeRequirements!: DegreeRequirementItemDto[];

  @ApiProperty({ type: [EnglishRequirementItemDto] })
  englishRequirements!: EnglishRequirementItemDto[];
}

export class AcademicRequirementsSectionDto {
  @ApiProperty() hasInfo!: boolean;
  @ApiProperty() infoKey!: string;
  @ApiPropertyOptional({ type: AcademicRequirementsContentDto })
  requirements?: AcademicRequirementsContentDto;
}

export class TuitionFeesDto {
  @ApiPropertyOptional() amount?: string | null;
  @ApiPropertyOptional() currency?: string | null;
  @ApiPropertyOptional() frequency?: string | null;
}

/** First relational `CourseIntakeScholarship` row (single object on `items.scholarships`). */
export class ScholarshipDetailsDto {
  @ApiPropertyOptional({ example: 'International Merit Scholarship' })
  scholarshipName?: string | null;

  @ApiPropertyOptional({ example: '14000' })
  scholarshipAmount?: string | null;

  @ApiPropertyOptional({ example: 'GBP' })
  currency?: string | null;

  /** From `amountType` (e.g. PERCENTAGE, FIXED). */
  @ApiPropertyOptional({ example: 'PERCENTAGE' })
  scholarshipType?: string | null;
}

export class FeesAndScholarshipsItemsDto {
  @ApiPropertyOptional({ type: TuitionFeesDto })
  tuitionFees?: TuitionFeesDto;

  /** From intake columns when set; shown even if `hasInfo` is false (no fees JSON metadata). */
  @ApiPropertyOptional()
  initialDeposit?: string | null;

  @ApiPropertyOptional()
  applicationFee?: string | null;

  /**
   * Single relational scholarship: first `CourseIntakeScholarship` row with a usable `amount`.
   */
  @ApiPropertyOptional({ type: ScholarshipDetailsDto })
  scholarships?: ScholarshipDetailsDto;

  @ApiPropertyOptional({
    description:
      'Short summary from fees JSON `scholarships` / `scholarshipsSummary` when metadata-backed `hasInfo`',
  })
  scholarshipsSummary?: string | null;
}

export class FeesAndScholarshipsSectionDto {
  @ApiProperty() hasInfo!: boolean;
  @ApiProperty() infoKey!: string;
  @ApiPropertyOptional({ type: FeesAndScholarshipsItemsDto })
  items?: FeesAndScholarshipsItemsDto;
}

export class IntakeDatesSectionDto {
  @ApiProperty() hasInfo!: boolean;
  @ApiProperty() infoKey!: string;
  @ApiPropertyOptional({
    type: [String],
    description:
      'Month names only (e.g. April, September). From intakeMetaData.months [1–12], normalized strings, or this intake’s intakeMonth.',
  })
  intakes?: string[];
}

export class CourseDetailsDto {
  @ApiProperty() courseId!: string;
  @ApiProperty() courseName!: string;
  @ApiProperty() ranking!: RankingDto;
  @ApiProperty() university!: UniversityDetailsDto;
  @ApiProperty({ type: [CourseTagDto] }) tags!: CourseTagDto[];
  @ApiProperty({ type: [CourseTabDto] }) tabs!: CourseTabDto[];
  @ApiPropertyOptional() aboutUs?: { description: string[] };
  @ApiPropertyOptional() campusLife?: { media: { videoUrl?: string[] } };
  @ApiProperty() location!: LocationDto;
  @ApiProperty({ type: AcademicRequirementsSectionDto })
  academicRequirements!: AcademicRequirementsSectionDto;
  @ApiProperty({ type: FeesAndScholarshipsSectionDto })
  feesAndScholarships!: FeesAndScholarshipsSectionDto;
  @ApiProperty({ type: IntakeDatesSectionDto })
  intakeDates!: IntakeDatesSectionDto;
}
