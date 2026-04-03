import {
  Controller,
  Get,
  Param,
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { CourseService } from '@bll/services/CourseService/CourseService';
import { CourseDetailsResponseDto } from '@shared/dtos/course-details/CourseDetailsResponseDto';
import { ScholarshipDetailsDto } from '@shared/dtos/course-details/CourseDetailsDto';

@ApiTags('courses')
@ApiExtraModels(CourseDetailsResponseDto, ScholarshipDetailsDto)
@Controller('courses')
export class CoursesController {
  constructor(private readonly courseService: CourseService) {}

  /**
   * GET /courses/:id
   * :id must be UniCourseIntakes.id (same as home/search courseId).
   * UniCourses.id / uniId are resolved inside CourseService from the loaded intake.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get course details by ID' })
  @ApiResponse({
    status: 200,
    description: 'Course details',
    type: CourseDetailsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CourseDetailsResponseDto> {
    const result = await this.courseService.getCourseDetails(id);
    if (result == null) {
      throw new NotFoundException('Course not found');
    }
    return result;
  }
}
