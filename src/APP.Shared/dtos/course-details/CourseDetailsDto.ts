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

export class LocationDto {
  @ApiPropertyOptional() city?: string | null;
  @ApiPropertyOptional() country?: string | null;
  @ApiPropertyOptional() state?: string | null;
  @ApiPropertyOptional() address?: string | null;
  @ApiPropertyOptional() coordinates?: Record<string, unknown> | null;
}

/** Backend only sends hasInfo + infoKey; frontend uses infoKey to resolve content from meta[]. */
export class HasInfoKeyDto {
  @ApiProperty() hasInfo!: boolean;
  @ApiProperty() infoKey!: string;
}

export class CourseDetailsDto {
  @ApiProperty() courseId!: string;
  @ApiProperty() courseName!: string;
  @ApiProperty() ranking!: RankingDto;
  @ApiProperty() university!: UniversityDetailsDto;
  @ApiProperty({ type: [String] }) tags!: string[];
  @ApiProperty({ type: [String] }) tabs!: string[];
  @ApiPropertyOptional() aboutUs?: { description: string[] };
  @ApiPropertyOptional() campusLife?: { media: { videoUrl?: string[] } };
  @ApiProperty() location!: LocationDto;
  @ApiProperty() academicRequirements!: HasInfoKeyDto;
  @ApiProperty() feesAndScholarships!: HasInfoKeyDto;
  @ApiProperty() intakeDates!: HasInfoKeyDto;
}
