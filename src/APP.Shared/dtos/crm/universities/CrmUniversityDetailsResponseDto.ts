import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  AboutUsDto,
  CampusLifeMediaDto,
  LocationDto,
  RankingDto,
} from '@shared/dtos/course-details/CourseDetailsDto';
import { MetaItemDto } from '@shared/dtos/course-details/MetaItemDto';
import { CommissionType } from '@shared/enums/CommissionType.enum';

export class CrmUniversityInfoDto {
  @ApiProperty() uniId!: string;
  @ApiProperty() uniName!: string;
  @ApiPropertyOptional({ nullable: true }) uniLogoUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) uniCoverImageUrl!: string | null;
  @ApiPropertyOptional({ nullable: true }) website!: string | null;
  @ApiPropertyOptional({ nullable: true }) establishedYear!: number | null;
  @ApiPropertyOptional({ nullable: true }) universityType!: string | null;
  @ApiPropertyOptional({ type: AboutUsDto, nullable: true })
  aboutUs!: AboutUsDto | null;
  @ApiPropertyOptional({ type: CampusLifeMediaDto, nullable: true })
  campusLife!: CampusLifeMediaDto | null;
  @ApiProperty({ type: LocationDto }) location!: LocationDto;
  @ApiProperty({ type: RankingDto }) ranking!: RankingDto;
}

export class ActiveIntakeItemDto {
  @ApiProperty({ example: 2026 })
  intakeYear!: number;

  @ApiProperty({ example: 'Q1' })
  quarter!: string;

  @ApiProperty({ example: 1 })
  intakeMonthFrom!: number;

  @ApiProperty({ example: 3 })
  intakeMonthTo!: number;
}

export class ActiveIntakesDto {
  @ApiProperty({ example: 2 })
  count!: number;

  @ApiProperty({ type: [ActiveIntakeItemDto] })
  items!: ActiveIntakeItemDto[];
}

export class CommissionDto {
  @ApiPropertyOptional({ example: '12.50', nullable: true })
  value!: string | null;

  @ApiPropertyOptional({
    enum: CommissionType,
    nullable: true,
    example: CommissionType.PERCENTAGE,
  })
  type!: CommissionType | null;
}

export class CrmStageRequiredDocumentDto {
  @ApiProperty() documentTypeId!: string;
  @ApiProperty() documentTypeCode!: string;
  @ApiProperty() documentTypeName!: string;
  @ApiProperty() isRequired!: boolean;
  @ApiProperty() minCount!: number;
  @ApiProperty() maxCount!: number;
}

export class CrmStageFlowItemDto {
  @ApiProperty({
    description: 'University-specific stage flow row id (UniApplicationStage.id)',
  })
  stageId!: string;

  @ApiProperty({ example: 'REVIEW' })
  stageCode!: string;

  @ApiPropertyOptional({ nullable: true, example: 'Review' })
  stageName!: string | null;

  @ApiProperty({ example: 1 })
  displayOrder!: number;

  @ApiProperty({ example: true })
  isEnabled!: boolean;

  @ApiProperty({
    type: [CrmStageRequiredDocumentDto],
    description: 'Read-only country-scoped required documents for this stage',
  })
  requiredDocuments!: CrmStageRequiredDocumentDto[];
}

export class CrmUniversityDetailsResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'University details retrieved successfully' })
  message!: string;

  @ApiProperty({ type: CrmUniversityInfoDto })
  university!: CrmUniversityInfoDto;

  @ApiProperty({ example: 312 })
  totalCourses!: number;

  @ApiProperty({ type: ActiveIntakesDto })
  activeIntakes!: ActiveIntakesDto;

  @ApiProperty({ type: CommissionDto })
  commission!: CommissionDto;

  @ApiProperty({ type: [CrmStageFlowItemDto] })
  customApplicationStageFlow!: CrmStageFlowItemDto[];

  @ApiProperty({ type: [MetaItemDto] })
  meta!: MetaItemDto[];
}
