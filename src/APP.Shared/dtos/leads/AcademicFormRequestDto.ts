import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { AcademicResultInputDto } from './AcademicResultInputDto';
import { EnglishTestInputDto } from './EnglishTestInputDto';

/**
 * Request DTO for PUT /api/leads/profile/academic-form.
 * All fields are optional. When sent, academic/English entries must be valid (update/add only; no delete).
 * Academic: degreeId must exist (levelOrder 1–4), gpa required, > 0, within degree gpaScale.
 * English: testId must exist; overall + all section scores required when test has sections; scores > 0, within maxScore.
 * Preferred: when provided, max 3; omit to leave existing selection unchanged.
 */
export class AcademicFormRequestDto {
  @ApiPropertyOptional({
    description:
      'Academic results (degrees levelOrder 1–4). Each entry: degreeId must exist, gpa required, > 0, within degree gpaScale.',
    type: [AcademicResultInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcademicResultInputDto)
  @IsOptional()
  academicResults?: AcademicResultInputDto[];

  @ApiPropertyOptional({
    description:
      "Last institute name; when provided, mapped to highest levelOrder degree's institute.",
    example: 'Daffodil University',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  lastAcademicInstitute?: string | null;

  @ApiPropertyOptional({
    description:
      'English test results. Each entry: testId must exist; overall score + all section scores (when test has sections) required, > 0, within maxScore.',
    type: [EnglishTestInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnglishTestInputDto)
  @IsOptional()
  englishTestResults?: EnglishTestInputDto[];

  @ApiPropertyOptional({
    description:
      'Preferred country IDs. When provided: non-empty, max 3. Omit to leave unchanged.',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  preferredCountryIds?: string[];

  @ApiPropertyOptional({
    description:
      'Preferred programme IDs. When provided: non-empty, max 3. Omit to leave unchanged.',
    type: [String],
    example: ['uuid1'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  preferredProgrammeIds?: string[];
}
