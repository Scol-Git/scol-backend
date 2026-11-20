import { Injectable } from '@nestjs/common';
import { type FindOptionsWhere, IsNull } from 'typeorm';
import { LIVE_INTAKE_WHERE } from '@bll/services/shared/LiveIntakeFilter';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { COURSE_DETAILS_RELATIONS } from './course-details.relations';

@Injectable()
export class CourseDetailsLoader {
  constructor(private readonly db: AppDbContext) {}

  /**
   * @param intakeId - UniCourseIntakes.id (same as listing/search courseId).
   * @param includeDrafts - CRM only: also load unpublished (draft) intakes. Leads never pass this.
   */
  async loadActiveIntakeOrNull(
    intakeId: string,
    includeDrafts = false,
  ): Promise<UniCourseIntakes | null> {
    return this.db.courseIntakes.findOne({
      where: {
        id: intakeId,
        ...this.liveWhere(includeDrafts),
      },
      relations: COURSE_DETAILS_RELATIONS,
    });
  }

  async loadCurrentYearIntakes(
    uniCourseId: string,
    includeDrafts = false,
  ): Promise<UniCourseIntakes[]> {
    const currentYear = new Date().getFullYear();
    return this.db.courseIntakes.find({
      where: {
        uniCourseId,
        ...this.liveWhere(includeDrafts),
        intakeYear: currentYear,
      },
      order: { intakeMonth: 'ASC' },
    });
  }

  private liveWhere(includeDrafts: boolean): FindOptionsWhere<UniCourseIntakes> {
    if (!includeDrafts) return LIVE_INTAKE_WHERE;
    const { isPublished: _published, ...rest } = LIVE_INTAKE_WHERE;
    void _published;
    return rest;
  }
}
