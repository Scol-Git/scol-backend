import { ApiProperty } from '@nestjs/swagger';

export class ApplicationOverviewUniversityInfoDto {
  @ApiProperty({ format: 'uuid' })
  universityId!: string;

  @ApiProperty()
  universityName!: string;

  @ApiProperty({ nullable: true })
  universityLogoUrl!: string | null;

  @ApiProperty({ nullable: true })
  universityCoverImageUrl!: string | null;
}

export class ApplicationOverviewCourseInfoDto {
  @ApiProperty({ format: 'uuid' })
  courseId!: string;

  @ApiProperty()
  courseName!: string;
}

export class ApplicationOverviewIntakeInfoDto {
  @ApiProperty({ example: 'September' })
  intakeMonth!: string;

  @ApiProperty({ example: '2026' })
  intakeYear!: string;
}

export class ApplicationOverviewCurrentStageDto {
  @ApiProperty()
  stageCode!: string;

  @ApiProperty()
  stageName!: string;

  @ApiProperty({
    nullable: true,
    example:
      'Application has been submitted to the university and is awaiting review.',
  })
  stageInformation!: string | null;
}

export class ApplicationOverviewCurrentStatusDto {
  @ApiProperty()
  statusCode!: string;

  @ApiProperty()
  statusName!: string;
}

export class ApplicationOverviewAssignedToDto {
  @ApiProperty({ format: 'uuid' })
  counsellorId!: string;

  @ApiProperty({ example: 'Admin' })
  counsellorName!: string;
}

export class ApplicationOverviewDto {
  @ApiProperty({ type: ApplicationOverviewUniversityInfoDto })
  universityInfo!: ApplicationOverviewUniversityInfoDto;

  @ApiProperty({ type: ApplicationOverviewCourseInfoDto })
  courseInfo!: ApplicationOverviewCourseInfoDto;

  @ApiProperty({ type: ApplicationOverviewIntakeInfoDto })
  intakeInfo!: ApplicationOverviewIntakeInfoDto;

  @ApiProperty({ type: ApplicationOverviewCurrentStageDto })
  currentStage!: ApplicationOverviewCurrentStageDto;

  @ApiProperty({ type: ApplicationOverviewCurrentStatusDto })
  currentStatus!: ApplicationOverviewCurrentStatusDto;

  @ApiProperty({
    example: '2025-11-15T00:00:00.000Z',
    nullable: true,
    description: 'Typically from submittedAt when set',
  })
  appliedDate!: string | null;

  @ApiProperty({ example: '2025-12-01T10:30:00.000Z' })
  lastUpdatedAt!: string;

  @ApiProperty({
    type: ApplicationOverviewAssignedToDto,
    nullable: true,
  })
  assignedTo!: ApplicationOverviewAssignedToDto | null;
}
