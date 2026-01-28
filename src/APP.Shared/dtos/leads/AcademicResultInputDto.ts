import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUUID,
  IsNumber,
  IsString,
  IsDateString,
  IsOptional,
  Min,
  Max,
  MaxLength,
} from 'class-validator';

/**
 * Input DTO for a single academic result
 */
export class AcademicResultInputDto {
  @ApiProperty({ description: 'Degree ID', example: 'uuid-ssc' })
  @IsUUID()
  degreeId!: string;

  @ApiPropertyOptional({ description: 'GPA score', example: 4.5 })
  @IsNumber()
  @Min(0)
  @Max(10)
  @IsOptional()
  gpa?: number;

  @ApiPropertyOptional({
    description: 'Institute name',
    example: 'ABC School',
  })
  @IsString()
  @MaxLength(255)
  @IsOptional()
  institute?: string;

  @ApiPropertyOptional({
    description: 'Passing date (ISO format)',
    example: '2018-06-01',
  })
  @IsDateString()
  @IsOptional()
  passingDate?: string;
}
