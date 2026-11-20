import { Injectable } from '@nestjs/common';
import { In, IsNull, Not } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ValidationException } from '@shared/exceptions/ValidationException';
import type { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import type { UniCourses } from '@entity/entities/UniCourses.entity';
import type { UpdateCrmCourseRequestDto } from '@shared/dtos/crm/courses/UpdateCrmCourseRequestDto';
import { assertPublishFieldsNotCleared } from '@bll/crm-services/publishing/PublishedFieldGuard';
import { assertPublishedIdentityUnchanged } from '@bll/crm-services/publishing/PublishedIdentityGuard';
import { ENGLISH_PUBLISH_COLUMNS } from '@bll/crm-services/publishing/PublishReadinessChecker';
import type { CourseIntakeScholarships } from '@entity/entities/CourseIntakeScholarships.entity';
import { CommissionType } from '@shared/enums/CommissionType.enum';

function present(value: unknown): boolean {
  return value != null && String(value).trim() !== '';
}

export interface ScholarshipWrite {
  name: string | null;
  amountType: CommissionType | null;
  amount: string | null;
}

/** Merge a PATCH with the stored scholarship row. Blank strings count as cleared. */
export function mergedScholarship(
  existing: Pick<CourseIntakeScholarships, 'name' | 'amountType' | 'amount'> | null,
  dto: UpdateCrmCourseRequestDto,
): ScholarshipWrite & { hasName: boolean; hasType: boolean; hasAmount: boolean } {
  const name = blankToNull(
    dto.scholarshipName !== undefined ? dto.scholarshipName : (existing?.name ?? null),
  );
  const amountType = blankToNull(
    dto.scholarshipType !== undefined
      ? dto.scholarshipType
      : (existing?.amountType ?? null),
  ) as CommissionType | null;
  const amount = blankToNull(
    dto.scholarshipAmount !== undefined
      ? dto.scholarshipAmount
      : (existing?.amount ?? null),
  );
  return {
    name,
    amountType,
    amount,
    hasName: name != null,
    hasType: amountType != null,
    hasAmount: amount != null,
  };
}

function blankToNull<T>(value: T | null | undefined): T | null {
  if (value == null) return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  return value;
}

@Injectable()
export class CrmCourseValidationService {
  constructor(private readonly db: AppDbContext) {}

  async validateUpdate(
    intake: UniCourseIntakes,
    course: UniCourses,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<void> {
    assertPublishedIdentityUnchanged('course', course.isPublished, course, dto);
    assertPublishedIdentityUnchanged('intake', intake.isPublished, intake, dto);
    assertPublishFieldsNotCleared('course', course.isPublished, dto);
    assertPublishFieldsNotCleared('intake', intake.isPublished, dto);
    await this.validateFkIds(dto, course.isPublished || intake.isPublished);
    await this.validateGpaRules(course, dto);
    await this.validateEnglishScoreRules(course, dto);
    await this.validateScholarshipSet(intake, dto);
    this.validateTuitionCurrencyPair(intake, dto);
    this.validateIntakeWindow(dto);
    await this.validateIntakeUniqueness(intake, course, dto);
  }

  private async validateFkIds(
    dto: UpdateCrmCourseRequestDto,
    isPublished: boolean,
  ): Promise<void> {
    if (dto.sysProgrammeId !== undefined) {
      const programme = await this.db.programmes.findOne({
        where: { id: dto.sysProgrammeId, deletedAt: IsNull() },
      });
      if (!programme) {
        throw new ValidationException('Programme not found', {
          sysProgrammeId: ['Invalid programme id'],
        });
      }
      if (isPublished && !programme.isPublished) {
        throw new ValidationException(
          'A published course cannot use an unpublished programme',
          { sysProgrammeId: ['Programme is not published'] },
        );
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

  private async validateGpaRules(
    course: UniCourses,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<void> {
    const minDegree =
      dto.minSysDegreeId !== undefined
        ? dto.minSysDegreeId
        : (course.minSysDegreeId ?? null);
    const higherDegree =
      dto.higherSysDegreeId !== undefined
        ? dto.higherSysDegreeId
        : (course.higherSysDegreeId ?? null);
    const minGpa =
      dto.minGpa !== undefined ? dto.minGpa : (course.minGpa ?? null);
    const higherGpa =
      dto.higherGpa !== undefined ? dto.higherGpa : (course.higherGpa ?? null);

    this.assertPaired(
      present(minDegree),
      present(minGpa),
      'minSysDegreeId and minGpa must be provided together',
      {
        minSysDegreeId: ['Must be paired with minGpa'],
        minGpa: ['Must be paired with minSysDegreeId'],
      },
    );
    this.assertPaired(
      present(higherDegree),
      present(higherGpa),
      'higherSysDegreeId and higherGpa must be provided together',
      {
        higherSysDegreeId: ['Must be paired with higherGpa'],
        higherGpa: ['Must be paired with higherSysDegreeId'],
      },
    );

    const degreeIds = [minDegree, higherDegree].filter((id): id is string => present(id));
    const degrees = degreeIds.length
      ? await this.db.academicDegrees.find({
          where: { id: In(degreeIds), deletedAt: IsNull() },
        })
      : [];
    const scaleById = new Map(degrees.map((d) => [d.id, d.gpaScale ?? null]));
    this.assertGpaWithinScale('minGpa', minGpa, present(minDegree) ? scaleById.get(minDegree as string) : null);
    this.assertGpaWithinScale('higherGpa', higherGpa, present(higherDegree) ? scaleById.get(higherDegree as string) : null);

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

  /** Overall and section are one pair. Publish-required tests cannot be cleared once the course is published. */
  private async validateEnglishScoreRules(
    course: UniCourses,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<void> {
    const existing = await this.db.courseEngReqs.find({
      where: { uniCourseId: course.id, deletedAt: IsNull() },
      relations: { SysEnglishTest: true },
    });
    const byTest = new Map(
      existing.map((row) => [
        row.SysEnglishTest?.testName?.trim().toUpperCase() ?? '',
        row,
      ]),
    );
    const publishRequiredTests = new Set(ENGLISH_PUBLISH_COLUMNS.map((c) => c.test));
    const tests = [
      {
        name: 'IELTS',
        overallKey: 'ieltsMinOverall' as const,
        sectionKey: 'ieltsMinSection' as const,
      },
      {
        name: 'PTE',
        overallKey: 'pteMinOverall' as const,
        sectionKey: 'pteMinSection' as const,
      },
      {
        name: 'TOEFL',
        overallKey: 'toeflMinOverall' as const,
        sectionKey: 'toeflMinSection' as const,
      },
    ];

    for (const t of tests) {
      const overallIn = dto[t.overallKey] !== undefined;
      const sectionIn = dto[t.sectionKey] !== undefined;
      if (!overallIn && !sectionIn) continue;

      const stored = byTest.get(t.name);
      const overall = overallIn
        ? dto[t.overallKey]
        : (stored?.minOverallReq ?? null);
      const section = sectionIn
        ? dto[t.sectionKey]
        : (stored?.minSectionReq ?? null);
      const hasOverall = present(overall);
      const hasSection = present(section);

      if (hasOverall !== hasSection) {
        throw new ValidationException(
          `${t.name} overall and section scores must be provided together`,
          {
            [t.overallKey]: [`Must be paired with ${t.sectionKey}`],
            [t.sectionKey]: [`Must be paired with ${t.overallKey}`],
          },
        );
      }

      if (course.isPublished && publishRequiredTests.has(t.name) && !hasOverall) {
        throw new ValidationException(
          `${t.name} scores cannot be cleared on a published course`,
          {
            [t.overallKey]: ['Required for published courses'],
            [t.sectionKey]: ['Required for published courses'],
          },
        );
      }

      for (const [field, value] of [
        [t.overallKey, overall],
        [t.sectionKey, section],
      ] as const) {
        if (!present(value)) continue;
        const n = Number(value);
        if (Number.isNaN(n) || n < 0) {
          throw new ValidationException(`${field} must be a number >= 0`, {
            [field]: ['Must be a number greater than or equal to 0'],
          });
        }
      }
    }
  }

  /** Name, type, and amount are one set. Metadata is validated on its own. */
  private async validateScholarshipSet(
    intake: UniCourseIntakes,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<void> {
    const touched =
      dto.scholarshipName !== undefined ||
      dto.scholarshipType !== undefined ||
      dto.scholarshipAmount !== undefined;
    if (!touched) return;

    const existing = await this.db.scholarships.findOne({
      where: { courseIntakeId: intake.id, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    const next = mergedScholarship(existing, dto);
    const filled = [next.hasName, next.hasType, next.hasAmount].filter(Boolean).length;
    if (filled !== 0 && filled !== 3) {
      throw new ValidationException(
        'scholarshipName, scholarshipType and scholarshipAmount must be provided together',
        {
          scholarshipName: ['Must be set or cleared with scholarshipType and scholarshipAmount'],
          scholarshipType: ['Must be set or cleared with scholarshipName and scholarshipAmount'],
          scholarshipAmount: ['Must be set or cleared with scholarshipName and scholarshipType'],
        },
      );
    }
  }

  /** Fee and currency are one pair, merged with the saved intake. */
  private validateTuitionCurrencyPair(
    intake: UniCourseIntakes,
    dto: UpdateCrmCourseRequestDto,
  ): void {
    const fee = blankToNull(
      dto.tuitionFee !== undefined ? dto.tuitionFee : (intake.tuitionFee ?? null),
    );
    const currency = blankToNull(
      dto.currency !== undefined ? dto.currency : (intake.currency ?? null),
    );
    this.assertPaired(
      present(fee),
      present(currency),
      'tuitionFee and currency must be provided together',
      {
        tuitionFee: ['Must be paired with currency'],
        currency: ['Must be paired with tuitionFee'],
      },
    );
  }

  private assertGpaWithinScale(
    field: 'minGpa' | 'higherGpa',
    value: string | null,
    gpaScale: string | null | undefined,
  ): void {
    if (!present(value)) return;
    const n = Number(value);
    const scale = gpaScale == null ? null : Number(gpaScale);
    if (Number.isNaN(n) || n < 0 || scale == null || Number.isNaN(scale) || n > scale) {
      const max = scale == null || Number.isNaN(scale) ? null : scale;
      throw new ValidationException(
        max == null ? `${field} degree has no GPA scale` : `${field} must be between 0 and ${gpaScale}`,
        { [field]: [max == null ? 'Degree has no GPA scale' : `GPA must be between 0 and ${gpaScale}`] },
      );
    }
  }

  private assertPaired(
    left: boolean,
    right: boolean,
    message: string,
    errors: Record<string, string[]>,
  ): void {
    if (left !== right) throw new ValidationException(message, errors);
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
