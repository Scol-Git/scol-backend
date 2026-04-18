import { ApiProperty } from '@nestjs/swagger';

export class ApplicationListUniversityInfoDto {
  @ApiProperty({ format: 'uuid' })
  universityId!: string;

  @ApiProperty({ example: 'University of Oxford' })
  universityName!: string;

  @ApiProperty({ example: 'https://example.com/logo.png', nullable: true })
  universityLogoUrl!: string | null;

  @ApiProperty({ example: 'https://example.com/cover.png', nullable: true })
  universityCoverImageUrl!: string | null;
}

export class ApplicationListCourseInfoDto {
  @ApiProperty({ format: 'uuid' })
  courseId!: string;

  @ApiProperty({ example: 'BSc Computer Science' })
  courseName!: string;
}

export class ApplicationListIntakeInfoDto {
  @ApiProperty({ format: 'uuid' })
  intakeId!: string;

  @ApiProperty({ example: 'September 2026' })
  intakeName!: string;
}

export class ApplicationListCurrentStageDto {
  @ApiProperty({ example: 'SUBMITTED' })
  stageCode!: string;

  @ApiProperty({ example: 'Submitted' })
  stageName!: string;
}

export class ApplicationListCurrentStatusDto {
  @ApiProperty({ example: 'SUBMITTED' })
  statusCode!: string;

  @ApiProperty({ example: 'Submitted' })
  statusName!: string;
}

export class ApplicationListOverviewDto {
  @ApiProperty({ type: ApplicationListUniversityInfoDto })
  universityInfo!: ApplicationListUniversityInfoDto;

  @ApiProperty({ type: ApplicationListCourseInfoDto })
  courseInfo!: ApplicationListCourseInfoDto;

  @ApiProperty({ type: ApplicationListIntakeInfoDto })
  intakeInfo!: ApplicationListIntakeInfoDto;

  @ApiProperty({ type: ApplicationListCurrentStageDto })
  currentStage!: ApplicationListCurrentStageDto;

  @ApiProperty({ type: ApplicationListCurrentStatusDto })
  currentStatus!: ApplicationListCurrentStatusDto;

  @ApiProperty({ example: '2025-12-01T10:30:00.000Z' })
  lastUpdatedAt!: string;
}

export class ApplicationListItemDto {
  @ApiProperty({ format: 'uuid' })
  applicationId!: string;

  @ApiProperty({ type: ApplicationListOverviewDto })
  applicationOverview!: ApplicationListOverviewDto;
}
