import { Injectable, Inject } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { CourseDetailsResponseDto } from '@shared/dtos/course-details/CourseDetailsResponseDto';
import { CourseDetailsMapper } from '@bll/mappings/course-details/CourseDetailsMapper';

/** Relations needed to build course details + meta from intake. */
const COURSE_DETAILS_RELATIONS = {
  UniCourse: {
    SysUniversity: {
      SysCountry: true,
      SysState: true,
      SysCity: true,
    },
    CourseEngReq: { SysEnglishTest: true },
    SysProgramme: true,
    SysAcademicDegree: true,
    minSysAcademicDegree: true,
    higherSysAcademicDegree: true,
  },
  CourseIntakeScholarship: true,
};

@Injectable()
export class CourseService {
  constructor(
    private readonly db: AppDbContext,
    private readonly courseDetailsMapper: CourseDetailsMapper,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * @param intakeId - UniCourseIntakes.id (same as listing courseId).
   * UniCourses.id / uniId come from intake.UniCourse after load.
   */
  async getCourseDetails(
    intakeId: string,
  ): Promise<CourseDetailsResponseDto | null> {
    const intake = await this.db.courseIntakes.findOne({
      where: {
        id: intakeId,
        isActive: true,
        deletedAt: IsNull(),
      },
      relations: COURSE_DETAILS_RELATIONS,
    });

    if (!intake) {
      this.logger.LogDebug('Course details: intake not found or inactive', {
        intakeId,
      });
      return null;
    }

    const currentYear = new Date().getFullYear();

    const currentYearIntakes = await this.db.courseIntakes.find({
      where: {
        uniCourseId: intake.uniCourseId,
        isActive: true,
        deletedAt: IsNull(),
        intakeYear: currentYear,
      },
      order: { intakeMonth: 'ASC' },
    });

    return this.courseDetailsMapper.toCourseDetailsResponse(
      intake,
      currentYearIntakes,
    );
  }
}
