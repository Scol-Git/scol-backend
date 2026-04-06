import { ApiProperty } from '@nestjs/swagger';
import { CourseDetailsDto } from './CourseDetailsDto';
import { MetaItemDto } from './MetaItemDto';

export class CourseDetailsResponseDto {
  @ApiProperty({ type: CourseDetailsDto })
  courseDetails!: CourseDetailsDto;

  @ApiProperty({ type: [MetaItemDto] })
  meta!: MetaItemDto[];
}
