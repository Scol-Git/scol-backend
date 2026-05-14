import {
  Controller,
  Get,
  Param,
  NotFoundException,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiExtraModels,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '@api/common/guards/OptionalJwtAuthGuard.guard';
import { CurrentUser } from '@api/common/decorators/CurrentUser.decorator';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { CourseService } from '@bll/services/CourseService/CourseService';
import { CourseDetailsResponseDto } from '@shared/dtos/course-details/CourseDetailsResponseDto';
import { CampusLifeMediaDto } from '@shared/dtos/course-details/CourseDetailsDto';

@ApiTags('courses')
@ApiExtraModels(CourseDetailsResponseDto, CampusLifeMediaDto)
@Controller('courses')
export class CoursesController {
  constructor(private readonly courseService: CourseService) {}

  /**
   * GET /courses/:id
   * :id must be UniCourseIntakes.id (same as home/search courseId).
   * UniCourses.id / uniId are resolved inside CourseService from the loaded intake.
   */
  @Get(':id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get course details by intake ID' })
  @ApiResponse({
    status: 200,
    description: 'Course details',
    type: CourseDetailsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Course not found' })
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user?: ICurrentUser,
  ): Promise<CourseDetailsResponseDto> {
    const result = await this.courseService.getCourseDetails(id, user);
    if (result == null) {
      throw new NotFoundException('Course not found');
    }
    return result;
  }
}
