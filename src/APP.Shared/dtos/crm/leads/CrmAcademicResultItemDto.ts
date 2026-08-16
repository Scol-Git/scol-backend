import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DegreeValidationDto } from '@shared/dtos/leads/DegreeValidationDto';

export class CrmAcademicResultItemDto {
  @ApiProperty({ format: 'uuid' })
  degreeId!: string;

  @ApiPropertyOptional({ example: 'SSC' })
  degreeName?: string;

  @ApiPropertyOptional({ example: 4.75, nullable: true })
  gpa!: number | null;

  @ApiPropertyOptional({ example: 'Example School', nullable: true })
  institute!: string | null;

  @ApiPropertyOptional({ example: '2019-06-01', nullable: true })
  passingDate!: string | null;

  @ApiProperty({ example: false })
  isVerified!: boolean;

  @ApiProperty({ type: DegreeValidationDto })
  validation!: DegreeValidationDto;
}
