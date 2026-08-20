import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';

const INTAKE_UPDATE_RELATIONS = {
  UniCourse: {
    SysUniversity: true,
    SysProgramme: true,
    SysAcademicDegree: true,
    minSysAcademicDegree: true,
    higherSysAcademicDegree: true,
  },
} as const;

@Injectable()
export class CrmCourseLookupService {
  constructor(private readonly db: AppDbContext) {}

  /**
   * Loads an intake + parent course for CRM update.
   * Soft-deleted intakes are treated as not found.
   * Inactive intakes are still loadable so ADMIN can re-activate them.
   *
   * @param courseIntakeId - UniCourseIntakes.id (exposed as courseId on the API)
   */
  async loadIntakeWithCourseOrThrow(
    courseIntakeId: string,
  ): Promise<UniCourseIntakes> {
    const intake = await this.db.courseIntakes.findOne({
      where: {
        id: courseIntakeId,
        deletedAt: IsNull(),
      },
      relations: INTAKE_UPDATE_RELATIONS,
    });

    if (!intake?.UniCourse || intake.UniCourse.deletedAt != null) {
      throw new NotFoundException('Course not found');
    }

    return intake;
  }
}
