import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RankingDto {
  @ApiPropertyOptional({ nullable: true }) position!: number | null;
  @ApiProperty() hasInfo!: boolean;
  @ApiProperty() infoKey!: string;
}

export class UniversityDetailsDto {
  @ApiProperty() uniId!: string;
  @ApiProperty() uniName!: string;
  @ApiProperty({ nullable: true }) uniLogoUrl!: string | null;
  @ApiProperty({ nullable: true }) uniCoverImageUrl!: string | null;
}

export class LocationCoordinatesDto {
  @ApiProperty({ nullable: true }) link!: string | null;
}

export class LocationDto {
  @ApiProperty({ nullable: true }) city!: string | null;
  @ApiProperty({ nullable: true }) country!: string | null;
  @ApiProperty({ nullable: true }) state!: string | null;
  @ApiProperty({ nullable: true }) address!: string | null;
  @ApiProperty({ type: LocationCoordinatesDto, nullable: true })
  coordinates!: LocationCoordinatesDto | null;
}

export class CourseTagDto {
  @ApiProperty() label!: string;
  @ApiProperty({ description: 'Tag category: established | type | location' })
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
  @ApiProperty({ type: AcademicRequirementsContentDto, nullable: true })
  requirements!: AcademicRequirementsContentDto | null;
}

export class TuitionFeesDto {
  @ApiProperty({ nullable: true }) amount!: string | null;
  @ApiProperty({ nullable: true }) currency!: string | null;
  @ApiProperty({ nullable: true }) frequency!: string | null;
}

export class FeesAndScholarshipsItemsDto {
  @ApiProperty({ type: TuitionFeesDto, nullable: true })
  tuitionFees!: TuitionFeesDto | null;

  @ApiProperty({ nullable: true }) initialDeposit!: string | null;
  @ApiProperty({ nullable: true }) applicationFee!: string | null;

  @ApiProperty({ enum: ['Available', 'Not Available'] })
  scholarships!: 'Available' | 'Not Available';
}

export class FeesAndScholarshipsSectionDto {
  @ApiProperty() hasInfo!: boolean;
  @ApiProperty() infoKey!: string;
  @ApiProperty({ type: FeesAndScholarshipsItemsDto, nullable: true })
  items!: FeesAndScholarshipsItemsDto | null;
}

export class IntakeDatesSectionDto {
  @ApiProperty() hasInfo!: boolean;
  @ApiProperty() infoKey!: string;
  @ApiProperty({
    type: [String],
    nullable: true,
    description:
      'Month names only (e.g. April, September). Null when no intakes exist for the current year.',
  })
  intakes!: string[] | null;
}

export class AboutUsDto {
  @ApiProperty({ type: [String] }) description!: string[];
}

export class CampusLifeDto {
  @ApiProperty({ type: [String], nullable: true }) videoUrl!: string[] | null;
}

export class CampusLifeMediaDto {
  @ApiProperty({ type: CampusLifeDto, nullable: true })
  media!: CampusLifeDto | null;
}

export class CourseDetailsDto {
  @ApiProperty() courseId!: string;
  @ApiProperty() courseName!: string;

  @ApiProperty({ type: RankingDto })
  ranking!: RankingDto;

  @ApiProperty({ type: UniversityDetailsDto })
  university!: UniversityDetailsDto;

  @ApiProperty({ type: [CourseTagDto] }) tags!: CourseTagDto[];
  @ApiProperty({ type: [CourseTabDto] }) tabs!: CourseTabDto[];

  @ApiProperty({ type: AboutUsDto, nullable: true })
  aboutUs!: AboutUsDto | null;

  @ApiProperty({ type: CampusLifeMediaDto, nullable: true })
  campusLife!: CampusLifeMediaDto | null;

  @ApiProperty({ type: LocationDto })
  location!: LocationDto;

  @ApiProperty({ type: AcademicRequirementsSectionDto })
  academicRequirements!: AcademicRequirementsSectionDto;

  @ApiProperty({ type: FeesAndScholarshipsSectionDto })
  feesAndScholarships!: FeesAndScholarshipsSectionDto;

  @ApiProperty({ type: IntakeDatesSectionDto })
  intakeDates!: IntakeDatesSectionDto;
}