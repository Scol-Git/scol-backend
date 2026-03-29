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
import { CourseDetailsService } from '@bll/services/course-details/CourseDetailsService';
import { CourseDetailsResponseDto } from '@shared/dtos/course-details/CourseDetailsResponseDto';

@ApiTags('courses')
@ApiExtraModels(CourseDetailsResponseDto)
@Controller('courses')
export class CoursesController {
  constructor(private readonly courseDetailsService: CourseDetailsService) {}

  /**
   * GET /courses/:id
   * :id must be UniCourseIntakes.id (same as home/search courseId).
   * UniCourses.id / uniId are resolved inside CourseDetailsService from the loaded intake.
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
    const result = await this.courseDetailsService.getCourseDetails(id);
    if (result == null) {
      throw new NotFoundException('Course not found');
    }
    return result;
  }
}
