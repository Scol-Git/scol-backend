import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { LIVE_INTAKE_WHERE } from '@bll/services/shared/LiveIntakeFilter';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { COURSE_DETAILS_RELATIONS } from './course-details.relations';

@Injectable()
export class CourseDetailsLoader {
  constructor(private readonly db: AppDbContext) {}

  /**
   * @param intakeId - UniCourseIntakes.id (same as listing/search courseId).
   */
  async loadActiveIntakeOrNull(
    intakeId: string,
  ): Promise<UniCourseIntakes | null> {
    return this.db.courseIntakes.findOne({
      where: {
        id: intakeId,
        ...LIVE_INTAKE_WHERE,
      },
      relations: COURSE_DETAILS_RELATIONS,
    });
  }

  async loadCurrentYearIntakes(
    uniCourseId: string,
  ): Promise<UniCourseIntakes[]> {
    const currentYear = new Date().getFullYear();
    return this.db.courseIntakes.find({
      where: {
        uniCourseId,
        ...LIVE_INTAKE_WHERE,
        intakeYear: currentYear,
      },
      order: { intakeMonth: 'ASC' },
    });
  }
}
