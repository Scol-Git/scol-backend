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
 * Request DTO for PUT /api/leads/profile/academic-form
 * Option A: Every PUT must include at least one valid gpa + lastAcademicInstitute (non-empty) + preferredCountryIds (non-empty, max 3) + preferredProgrammeIds (non-empty, max 3).
 */
export class AcademicFormRequestDto {
  @ApiPropertyOptional({
    description: 'Academic results (degrees). At least one with valid gpa required for valid PUT.',
    type: [AcademicResultInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcademicResultInputDto)
  @IsOptional()
  academicResults?: AcademicResultInputDto[];

  @ApiPropertyOptional({
    description: "Last institute name; required and non-empty when there is at least one valid gpa. Mapped to highest levelOrder degree's institute.",
    example: 'Daffodil University',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  lastAcademicInstitute?: string | null;

  @ApiPropertyOptional({
    description: 'English test results. Optional; when sent, overall + all section scores must be valid to persist.',
    type: [EnglishTestInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnglishTestInputDto)
  @IsOptional()
  englishTestResults?: EnglishTestInputDto[];

  @ApiPropertyOptional({
    description: 'Preferred country IDs (required non-empty for valid PUT, max 3)',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  preferredCountryIds?: string[];

  @ApiPropertyOptional({
    description: 'Preferred programme IDs (required non-empty for valid PUT, max 3)',
    type: [String],
    example: ['uuid1'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  preferredProgrammeIds?: string[];
}
