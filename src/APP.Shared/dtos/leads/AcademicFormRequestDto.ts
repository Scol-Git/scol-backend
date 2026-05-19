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
 * academicResults and lastAcademicInstitute (non-empty) must be provided together when either is sent.
 * lastAcademicInstitute is stored on the highest levelOrder degree row in the DB, not the highest degree in the request.
 * English/preferred sections are optional; omit to leave unchanged.
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
      'Last institute name; required together with academicResults. Stored on the highest levelOrder degree row in the database.',
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
