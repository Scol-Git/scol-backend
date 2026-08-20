import { ApiProperty } from '@nestjs/swagger';
import { CourseDetailsBaseDto } from '@shared/dtos/course-details/CourseDetailsDto';
import { MetaItemDto } from '@shared/dtos/course-details/MetaItemDto';

export class CrmCourseDetailsDto extends CourseDetailsBaseDto {}

export class CrmCourseDetailsResponseDto {
  @ApiProperty({ type: CrmCourseDetailsDto })
  courseDetails!: CrmCourseDetailsDto;

  @ApiProperty({ type: [MetaItemDto] })
  meta!: MetaItemDto[];

  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Course details retrieved successfully' })
  message!: string;
}
