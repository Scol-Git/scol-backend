import { Injectable, Inject } from '@nestjs/common';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { CourseDetailsResponseDto } from '@shared/dtos/course-details/CourseDetailsResponseDto';
import { CourseDetailsMapper } from '@bll/mappings/course-details/CourseDetailsMapper';
import { CourseDetailsLeadFlagsResolver } from './CourseDetailsLeadFlagsResolver';
import { CourseDetailsLoader } from './CourseDetailsLoader';

@Injectable()
export class CourseService {
  constructor(
    private readonly courseDetailsLoader: CourseDetailsLoader,
    private readonly courseDetailsMapper: CourseDetailsMapper,
    private readonly leadFlagsResolver: CourseDetailsLeadFlagsResolver,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * @param intakeId - UniCourseIntakes.id (same as listing courseId).
   * UniCourses.id / uniId come from intake.UniCourse after load.
   */
  async getCourseDetails(
    intakeId: string,
    user?: ICurrentUser,
  ): Promise<CourseDetailsResponseDto | null> {
    const intake =
      await this.courseDetailsLoader.loadActiveIntakeOrNull(intakeId);

    if (!intake) {
      this.logger.LogDebug('Course details: intake not found or inactive', {
        intakeId,
      });
      return null;
    }

    const [currentYearIntakes, leadFlags] = await Promise.all([
      this.courseDetailsLoader.loadCurrentYearIntakes(intake.uniCourseId),
      this.leadFlagsResolver.resolve(intake, user),
    ]);

    return this.courseDetailsMapper.toCourseDetailsResponse(
      intake,
      currentYearIntakes,
      leadFlags,
    );
  }
}
