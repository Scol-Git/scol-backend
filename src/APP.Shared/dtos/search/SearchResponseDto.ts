import { ApiProperty } from '@nestjs/swagger';
import { UserState } from '@shared/enums/UserState.enum';
import { AcademicFormStatus } from '@shared/enums/AcademicFormStatus.enum';
import { ListType } from '@shared/enums/ListType.enum';
import { CursorPaginationResponseDto } from './CursorPaginationDto';
import { CourseResultDto } from './CourseResultDto';

/**
 * Common response DTO for Home, Search, and Advanced Search APIs
 */
export class SearchResponseDto {
  @ApiProperty({
    description: 'User authentication state',
    enum: UserState,
  })
  userState!: UserState;

  @ApiProperty({
    description: 'Academic form completion status',
    enum: AcademicFormStatus,
  })
  academicFormStatus!: AcademicFormStatus;

  @ApiProperty({
    description: 'List type (eligible or ineligible)',
    enum: ListType,
  })
  listType!: ListType;

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
