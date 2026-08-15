import { ApiProperty } from '@nestjs/swagger';
import { CourseResultDto } from '@shared/dtos/search/CourseResultDto';
import { CursorPaginationResponseDto } from '@shared/dtos/search/CursorPaginationDto';

/**
 * Response DTO for POST /crm/search
 * Slim CRM response with courses and pagination only.
 */
export class CrmCourseSearchResponseDto {
  @ApiProperty({
    description: 'Pagination information',
    type: CursorPaginationResponseDto,
  })
  pagination!: CursorPaginationResponseDto;

  @ApiProperty({
    description: 'Course results',
    type: [CourseResultDto],
  })
  courses!: CourseResultDto[];
}
