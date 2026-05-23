import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
  ArrayMinSize,
  IsNotEmpty,
} from 'class-validator';
import { AcademicResultInputDto } from './AcademicResultInputDto';
import { EnglishTestInputDto } from './EnglishTestInputDto';

/**
 * Request DTO for PUT /api/leads/profile/academic-form.
 * All sections are optional.
 * Omit a field to leave it unchanged.
 * lastAcademicInstitute is stored on the highest levelOrder degree row in the DB.
 */
export class AcademicFormRequestDto {
  @ApiPropertyOptional({
    description:
      'Academic results must be > 0 and within degree GPA scale.',
    type: [AcademicResultInputDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AcademicResultInputDto)
  @IsOptional()
  academicResults?: AcademicResultInputDto[];

  @ApiPropertyOptional({
    description:
      'Last institute name. Requires at least one academic degree row for the lead in DB.',
    example: 'Daffodil University',
    nullable: true,
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  lastAcademicInstitute?: string | null;

  @ApiPropertyOptional({
    description:
      'IELTS/TOEFL/PTE results. Overall and section scores must be > 0 and within max score.',
    type: [EnglishTestInputDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EnglishTestInputDto)
  @IsOptional()
  englishTestResults?: EnglishTestInputDto[];

  @ApiPropertyOptional({
    description:
      'Preferred country IDs.',
    type: [String],
    example: ['uuid1'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  preferredCountryIds?: string[];

  @ApiPropertyOptional({
    description:
    'Preferred programme IDs.',
    type: [String],
    example: ['uuid1'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  preferredProgrammeIds?: string[];
}
