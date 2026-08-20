import { Injectable, NotFoundException } from '@nestjs/common';
import { CourseDetailsLoader } from '@bll/services/CourseService/CourseDetailsLoader';
import { CourseDetailsMapper } from '@bll/mappings/course-details/CourseDetailsMapper';
import type { CrmCourseDetailsResponseDto } from '@shared/dtos/crm/courses/CrmCourseDetailsResponseDto';

@Injectable()
export class CrmCourseDetailsService {
  constructor(
    private readonly courseDetailsLoader: CourseDetailsLoader,
    private readonly courseDetailsMapper: CourseDetailsMapper,
  ) {}

  /**
   * @param courseIntakeId - UniCourseIntakes.id (exposed as courseId on the API)
   */
  async getCourseDetails(
    courseIntakeId: string,
  ): Promise<CrmCourseDetailsResponseDto> {
    const intake =
      await this.courseDetailsLoader.loadActiveIntakeOrNull(courseIntakeId);

    if (!intake) {
      throw new NotFoundException('Course not found');
    }

    const currentYearIntakes =
      await this.courseDetailsLoader.loadCurrentYearIntakes(intake.uniCourseId);

    const mapped = this.courseDetailsMapper.toCrmCourseDetailsResponse(
      intake,
      currentYearIntakes,
    );

    return {
      success: true,
      message: 'Course details retrieved successfully',
      courseDetails: mapped.courseDetails,
      meta: mapped.meta,
    };
  }
}
