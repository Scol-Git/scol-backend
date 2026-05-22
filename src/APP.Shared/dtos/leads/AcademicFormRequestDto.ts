import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsArray,
  IsOptional,
  IsString,
  IsNotEmpty,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { AcademicResultInputDto } from './AcademicResultInputDto';
import { EnglishTestInputDto } from './EnglishTestInputDto';

/**
 * Request DTO for PUT /api/leads/profile/academic-form.
 *
 * All sections are optional — omit to leave that section unchanged.
 * academicResults and lastAcademicInstitute must be provided together when either is sent.
 * lastAcademicInstitute is stored on the highest levelOrder degree row in the DB.
 */
export class AcademicFormRequestDto {
  @ApiPropertyOptional({
    description:
      'Academic results must be sent with lastAcademicInstitute. ' +
      'gpa is required > 0 and within degree gpaScale.',
    type: [AcademicResultInputDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)  // @ArrayMinSize(1) makes the rule explicit: if you send this field, it must contain at least one item. Want to skip? Omit the field. []
  @ValidateNested({ each: true })
  @Type(() => AcademicResultInputDto)
  academicResults?: AcademicResultInputDto[];

  @ApiPropertyOptional({
    description:
      'Last institute name. Required (non-empty) together with academicResults.',
    example: 'Daffodil University',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty() 
  lastAcademicInstitute?: string;  

  @ApiPropertyOptional({
    description:
      'IELTS/TOEFL/PTE scores. Use testId and section ids from GET academic-form. ' +
      'Overall score required; when the test has sections, all section scores are required.',
    type: [EnglishTestInputDto],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EnglishTestInputDto)
  englishTestResults?: EnglishTestInputDto[];

  @ApiPropertyOptional({
    description:
      'Preferred country IDs. When provided: at least one valid UUID. Omit to leave unchanged.',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  preferredCountryIds?: string[];

  @ApiPropertyOptional({
    description:
      'Preferred programme IDs. When provided: at least one valid UUID. Omit to leave unchanged.',
    type: [String],
    example: ['uuid1'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  preferredProgrammeIds?: string[];
}