import { Injectable } from '@nestjs/common';
import { IsNull, Not } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ValidationException } from '@shared/exceptions/ValidationException';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import type { UniCourses } from '@entity/entities/UniCourses.entity';
import type { UpdateCrmCourseRequestDto } from '@shared/dtos/crm/courses/UpdateCrmCourseRequestDto';

@Injectable()
export class CrmCourseValidationService {
  constructor(private readonly db: AppDbContext) {}

  async validateUpdate(
    intake: UniCourseIntakes,
    course: UniCourses,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<void> {
    await this.validateFkIds(dto);
    this.validateGpaRules(course, dto);
    this.validateIntakeWindow(dto);
    await this.validateIntakeUniqueness(intake, course, dto);
  }

  private async validateFkIds(dto: UpdateCrmCourseRequestDto): Promise<void> {
    if (dto.sysProgrammeId !== undefined) {
      const programme = await this.db.programmes.findOne({
        where: { id: dto.sysProgrammeId, deletedAt: IsNull() },
      });
      if (!programme) {
        throw new ValidationException('Programme not found', {
          sysProgrammeId: ['Invalid programme id'],
        });
      }
    }

    const degreeIds = [
      dto.sysDegreeId,
      dto.minSysDegreeId,
      dto.higherSysDegreeId,
    ].filter((id): id is string => typeof id === 'string');

    for (const degreeId of degreeIds) {
      const degree = await this.db.academicDegrees.findOne({
        where: { id: degreeId, deletedAt: IsNull() },
      });
      if (!degree) {
        throw new ValidationException('Academic degree not found', {
          degreeId: [`Invalid academic degree id: ${degreeId}`],
        });
      }
    }
  }

  private validateGpaRules(
    course: UniCourses,
    dto: UpdateCrmCourseRequestDto,
  ): void {
    const minGpa =
      dto.minGpa !== undefined ? dto.minGpa : (course.minGpa ?? null);
    const higherGpa =
      dto.higherGpa !== undefined ? dto.higherGpa : (course.higherGpa ?? null);

    for (const [field, value] of [
      ['minGpa', minGpa],
      ['higherGpa', higherGpa],
    ] as const) {
      if (value == null) continue;
      const n = Number(value);
      if (Number.isNaN(n) || n < 0 || n > 5) {
        throw new ValidationException(`${field} must be between 0 and 5`, {
          [field]: ['GPA must be between 0 and 5'],
        });
      }
    }

    if (
      minGpa != null &&
      higherGpa != null &&
      Number(higherGpa) < Number(minGpa)
    ) {
      throw new ValidationException(
        'higherGpa must be greater than or equal to minGpa',
        { higherGpa: ['higherGpa must be >= minGpa'] },
      );
    }
  }

  private validateIntakeWindow(dto: UpdateCrmCourseRequestDto): void {
    if (dto.intakeYear === undefined) return;

    const currentYear = new Date().getFullYear();
    const minYear = currentYear - 1;
    const maxYear = currentYear + 5;

    if (dto.intakeYear < minYear || dto.intakeYear > maxYear) {
      throw new ValidationException(
        `intakeYear must be between ${minYear} and ${maxYear}`,
        { intakeYear: [`Must be between ${minYear} and ${maxYear}`] },
      );
    }
  }

  private async validateIntakeUniqueness(
    intake: UniCourseIntakes,
    course: UniCourses,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<void> {
    const nextMonth =
      dto.intakeMonth !== undefined ? dto.intakeMonth : intake.intakeMonth;
    const nextYear =
      dto.intakeYear !== undefined ? dto.intakeYear : intake.intakeYear;

    if (nextMonth === intake.intakeMonth && nextYear === intake.intakeYear) {
      return;
    }

    const conflict = await this.db.courseIntakes.findOne({
      where: {
        uniCourseId: course.id,
        intakeMonth: nextMonth,
        intakeYear: nextYear,
        deletedAt: IsNull(),
        id: Not(intake.id),
      },
    });

    if (conflict) {
      throw new ValidationException(
        'An intake already exists for this course in the selected month and year',
        {
          intakeMonth: ['Duplicate intake month/year for this course'],
          intakeYear: ['Duplicate intake month/year for this course'],
        },
      );
    }
  }
}
