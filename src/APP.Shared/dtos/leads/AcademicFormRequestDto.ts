import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsUUID,
  IsArray,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { AcademicResultInputDto } from './AcademicResultInputDto';
import { EnglishTestInputDto } from './EnglishTestInputDto';

/**
 * Request DTO for PUT /api/leads/profile/academic-form
 * Single transactional write for the entire form
 */
export class AcademicFormRequestDto {
  @ApiPropertyOptional({
    description: 'Academic results (degrees)',
    type: [AcademicResultInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AcademicResultInputDto)
  @IsOptional()
  academicResults?: AcademicResultInputDto[];

  @ApiPropertyOptional({
    description: 'English test results',
    type: [EnglishTestInputDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnglishTestInputDto)
  @IsOptional()
  englishTestResults?: EnglishTestInputDto[];

  @ApiPropertyOptional({
    description: 'Preferred country IDs',
    type: [String],
    example: ['uuid1', 'uuid2'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  preferredCountryIds?: string[];

  @ApiPropertyOptional({
    description: 'Preferred programme IDs',
    type: [String],
    example: ['uuid1'],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsOptional()
  preferredProgrammeIds?: string[];
}
