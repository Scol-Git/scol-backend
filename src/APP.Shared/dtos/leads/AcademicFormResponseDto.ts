import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { AcademicResultItemDto } from './AcademicResultItemDto';
import { EnglishTestResultItemDto } from './EnglishTestResultItemDto';
import { PreferredCountryItemDto } from './PreferredCountryItemDto';
import { PreferredProgrammeItemDto } from './PreferredProgrammeItemDto';

/**
 * Response DTO for GET/PUT /api/leads/profile/academic-form
 * academicResults (always 4 items), englishTestResults (all system tests), preferredCountries, preferredProgrammes, lastAcademicInstitute, academicFormStatus.
 * Filled booleans per value field; lastAcademicInstitute derived from highest levelOrder valid degree's institute (null if none).
 */
export class AcademicFormResponseDto {
  @ApiProperty({
    description: 'Academic form completion status (2-field: academic + English)',
    enum: AcademicFormStatus,
  })
  academicFormStatus!: AcademicFormStatus;

  @ApiProperty({
    description: 'Always 4 items (SSC, HSC, BSC, Master). Value fields null when not filled; filled booleans.',
    type: [AcademicResultItemDto],
  })
  academicResults!: AcademicResultItemDto[];

  @ApiProperty({
    description: 'One per system English test. Value fields null when not filled; filled booleans.',
    type: [EnglishTestResultItemDto],
  })
  englishTestResults!: EnglishTestResultItemDto[];

  @ApiProperty({
    description: 'All system countries with id, name, selected (true if in lead’s preferred list). Never null.',
    type: [PreferredCountryItemDto],
  })
  preferredCountries!: PreferredCountryItemDto[];

  @ApiProperty({
    description: 'All system programmes with id, name, selected (true if in lead’s preferred list). Never null.',
    type: [PreferredProgrammeItemDto],
  })
  preferredProgrammes!: PreferredProgrammeItemDto[];

  @ApiPropertyOptional({
    description: "Derived from highest levelOrder valid degree's institute. Null if no such degree.",
    example: 'Daffodil University',
    nullable: true,
  })
  lastAcademicInstitute!: string | null;
}
