import { ApiProperty } from '@nestjs/swagger';

/**
 * Validation rules for a degree (academic result).
 */
export class DegreeValidationDto {
  @ApiProperty({
    description: 'Maximum GPA scale for this degree',
    example: 5,
  })
  gpaScale!: number;
}
