import { ApiProperty } from '@nestjs/swagger';

export class UniversityIntakePeriodDto {
  @ApiProperty({ example: 9 })
  intakeMonth!: number;

  @ApiProperty({ example: 2027 })
  intakeYear!: number;

  @ApiProperty({ example: 12, description: 'Draft and published courses in this period' })
  courseCount!: number;
}

export class UniversityIntakePeriodsResponseDto {
  @ApiProperty({ type: [UniversityIntakePeriodDto] })
  intakes!: UniversityIntakePeriodDto[];
}

export class UpdateIntakeFeesResponseDto {
  @ApiProperty({ example: 12 })
  updatedCount!: number;
}
