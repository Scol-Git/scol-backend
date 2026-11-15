import { Injectable, NotFoundException } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { LIVE_INTAKE_WHERE } from '@bll/services/shared/LiveIntakeFilter';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';

const intakeEligibilityRelations = {
  UniCourse: {
    SysUniversity: true,
    minSysAcademicDegree: true,
    higherSysAcademicDegree: true,
    CourseEngReq: {
      SysEnglishTest: {
        SysEnglishTestSection: true,
      },
    },
  },
} as const;

@Injectable()
export class EligibilityLoader {
  constructor(private readonly db: AppDbContext) {}

  async loadCourseIntakeBySelectionOrThrow(
    universityId: string,
    courseId: string,
    intakeMonth: number,
    intakeYear: number,
  ): Promise<UniCourseIntakes> {
    const intake = await this.db.courseIntakes.findOne({
      where: {
        uniCourseId: courseId,
        intakeMonth,
        intakeYear,
        ...LIVE_INTAKE_WHERE,
        UniCourse: { uniId: universityId },
      },
      relations: intakeEligibilityRelations,
    });

    if (!intake) {
      throw new NotFoundException(
        'No course intake found for the provided university, course, and intake',
      );
    }

    return intake;
  }

  async loadCourseIntakeByIdOrThrow(intakeId: string): Promise<UniCourseIntakes> {
    const intake = await this.db.courseIntakes.findOne({
      where: {
        id: intakeId,
        ...LIVE_INTAKE_WHERE,
      },
      relations: intakeEligibilityRelations,
    });

    if (!intake) {
      throw new NotFoundException('Course intake not found or inactive');
    }

    return intake;
  }
}
