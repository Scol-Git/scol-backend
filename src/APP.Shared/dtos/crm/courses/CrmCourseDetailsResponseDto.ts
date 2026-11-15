import { ApiProperty } from '@nestjs/swagger';
import { CourseDetailsBaseDto } from '@shared/dtos/course-details/CourseDetailsDto';
import { MetaItemDto } from '@shared/dtos/course-details/MetaItemDto';

export class CrmCourseDetailsDto extends CourseDetailsBaseDto {}

export class CrmCoursePublishInfoDto {
  @ApiProperty() intakeIsPublished!: boolean;
  @ApiProperty() courseIsPublished!: boolean;
  @ApiProperty() universityIsPublished!: boolean;
  @ApiProperty({ nullable: true, type: String }) importBatchId!: string | null;
}

export class CrmCourseDetailsResponseDto {
  @ApiProperty({ type: CrmCourseDetailsDto })
  courseDetails!: CrmCourseDetailsDto;

  @ApiProperty({ type: [MetaItemDto] })
  meta!: MetaItemDto[];

  @ApiProperty({ type: CrmCoursePublishInfoDto })
  publish!: CrmCoursePublishInfoDto;

  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Course details retrieved successfully' })
  message!: string;
}
