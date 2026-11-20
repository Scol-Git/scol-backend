import { ApiProperty } from '@nestjs/swagger';
import { CourseDetailsBaseDto } from '@shared/dtos/course-details/CourseDetailsDto';
import { MetaItemDto } from '@shared/dtos/course-details/MetaItemDto';
import { MetaDataItemDto } from '@shared/dtos/common/MetaDataItemDto';
import { CommissionType } from '@shared/enums/CommissionType.enum';

export class CrmCourseDetailsDto extends CourseDetailsBaseDto {
  @ApiProperty({ nullable: true, type: String })
  programmeName!: string | null;
}

export class CrmCoursePublishInfoDto {
  @ApiProperty() intakeIsPublished!: boolean;
  @ApiProperty() courseIsPublished!: boolean;
  @ApiProperty() universityIsPublished!: boolean;
  @ApiProperty({ nullable: true, type: String }) importBatchId!: string | null;
}

/** CRM-only values for the editors (not shown as separate student-app fields). */
export class CrmCourseEditIdsDto {
  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  sysProgrammeId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  minSysDegreeId!: string | null;

  @ApiProperty({ format: 'uuid', nullable: true, type: String })
  higherSysDegreeId!: string | null;

  @ApiProperty({ nullable: true, type: String })
  externalUrl!: string | null;

  @ApiProperty({ nullable: true, type: Number })
  courseDuration!: number | null;

  @ApiProperty({
    nullable: true,
    type: String,
    example: '30-06-2027',
    description: 'Application deadline as DD-MM-YYYY',
  })
  applicationDeadline!: string | null;

  @ApiProperty({ nullable: true, type: String })
  scholarshipName!: string | null;

  @ApiProperty({ nullable: true, enum: CommissionType })
  scholarshipType!: CommissionType | null;

  @ApiProperty({ nullable: true, type: String })
  scholarshipAmount!: string | null;

  @ApiProperty({ nullable: true, type: [MetaDataItemDto] })
  scholarshipMetaData!: MetaDataItemDto[] | null;

  @ApiProperty({ nullable: true, type: [MetaDataItemDto] })
  requirementMetaData!: MetaDataItemDto[] | null;

  @ApiProperty({ nullable: true, type: [MetaDataItemDto] })
  feesMetaData!: MetaDataItemDto[] | null;

  @ApiProperty({ nullable: true, type: [MetaDataItemDto] })
  intakeMetaData!: MetaDataItemDto[] | null;
}

export class CrmCourseDetailsResponseDto {
  @ApiProperty({ type: CrmCourseDetailsDto })
  courseDetails!: CrmCourseDetailsDto;

  @ApiProperty({ type: [MetaItemDto] })
  meta!: MetaItemDto[];

  @ApiProperty({ type: CrmCoursePublishInfoDto })
  publish!: CrmCoursePublishInfoDto;

  @ApiProperty({ type: CrmCourseEditIdsDto })
  edit!: CrmCourseEditIdsDto;

  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Course details retrieved successfully' })
  message!: string;
}
