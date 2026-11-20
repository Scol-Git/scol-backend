import { Injectable } from '@nestjs/common';
import { IsNull, type EntityManager, type Repository } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { UniCourses } from '@entity/entities/UniCourses.entity';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { CourseEngReq } from '@entity/entities/CourseEngReq.entity';
import { CourseIntakeScholarships } from '@entity/entities/CourseIntakeScholarships.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { applyDefinedFields } from '@shared/utils/PartialUpdateUtil';
import {
  COURSE_UPDATABLE_FIELDS,
  INTAKE_UPDATABLE_FIELDS,
  type UpdateCrmCourseRequestDto,
} from '@shared/dtos/crm/courses/UpdateCrmCourseRequestDto';
import type { UpdateCrmCourseResponseDto } from '@shared/dtos/crm/courses/UpdateCrmCourseResponseDto';
import { ValidationException } from '@shared/exceptions/ValidationException';
import {
  ENGLISH_TESTS,
  testHeader,
  type EnglishTestName,
} from '@bll/crm-services/bulk-imports/course/courseContext';
import { dmyToIso } from '@shared/utils/dmyDate';
import { CrmCourseLookupService } from './helpers/CrmCourseLookupService';
import { CrmCourseValidationService, mergedScholarship } from './helpers/CrmCourseValidationService';

type IntakePatch = {
  intakeMonth?: number;
  intakeYear?: number;
  courseDuration?: number | null;
  applicationDeadline?: Date | null;
  tuitionFee?: string | null;
  currency?: string | null;
  initialDeposit?: string | null;
  initialDepositType?: string | null;
  applicationFee?: string | null;
  isActive?: boolean;
  intakeMetaData?: UpdateCrmCourseRequestDto['intakeMetaData'];
  feesMetaData?: UpdateCrmCourseRequestDto['feesMetaData'];
  scholarshipMetaData?: UpdateCrmCourseRequestDto['scholarshipMetaData'];
};

type EnglishFieldKey =
  | 'ieltsMinOverall'
  | 'ieltsMinSection'
  | 'pteMinOverall'
  | 'pteMinSection'
  | 'toeflMinOverall'
  | 'toeflMinSection';

@Injectable()
export class CrmCourseUpdateService {
  constructor(
    private readonly db: AppDbContext,
    private readonly lookupService: CrmCourseLookupService,
    private readonly validationService: CrmCourseValidationService,
  ) {}

  /**
   * @param courseIntakeId - UniCourseIntakes.id (exposed as courseId on the API)
   */
  async updateCourse(
    courseIntakeId: string,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<UpdateCrmCourseResponseDto> {
    const intake =
      await this.lookupService.loadIntakeWithCourseOrThrow(courseIntakeId);
    const course = intake.UniCourse;

    await this.validationService.validateUpdate(intake, course, dto);

    await this.db.transaction(async (manager) => {
      const courseRepo = manager.getRepository(UniCourses);
      const intakeRepo = manager.getRepository(UniCourseIntakes);

      const courseChanged = applyDefinedFields(
        course,
        dto,
        COURSE_UPDATABLE_FIELDS,
      );
      // Loaded relations win over the foreign-key columns on save.
      if (dto.sysProgrammeId) {
        course.SysProgramme = { id: dto.sysProgrammeId } as SysProgrammes;
      }
      const intakePatch = this.buildIntakePatch(dto);
      const intakeChanged = applyDefinedFields(
        intake,
        intakePatch,
        INTAKE_UPDATABLE_FIELDS,
      );

      if (courseChanged) {
        await courseRepo.save(course);
      }
      if (intakeChanged) {
        await intakeRepo.save(intake);
      }

      await this.applyEnglishRequirements(manager, course.id, dto);
      await this.applyScholarship(manager, intake.id, dto);
    });

    return {
      success: true,
      message: 'Course updated successfully',
    };
  }

  private buildIntakePatch(dto: UpdateCrmCourseRequestDto): IntakePatch {
    const patch: IntakePatch = {};

    if (dto.intakeMonth !== undefined) patch.intakeMonth = dto.intakeMonth;
    if (dto.intakeYear !== undefined) patch.intakeYear = dto.intakeYear;
    if (dto.courseDuration !== undefined)
      patch.courseDuration = dto.courseDuration;
    if (dto.tuitionFee !== undefined) patch.tuitionFee = dto.tuitionFee;
    if (dto.currency !== undefined) patch.currency = dto.currency;
    if (dto.initialDeposit !== undefined)
      patch.initialDeposit = dto.initialDeposit;
    if (dto.initialDepositType !== undefined)
      patch.initialDepositType = dto.initialDepositType;
    if (dto.applicationFee !== undefined)
      patch.applicationFee = dto.applicationFee;
    if (dto.isActive !== undefined) patch.isActive = dto.isActive;
    if (dto.intakeMetaData !== undefined)
      patch.intakeMetaData = dto.intakeMetaData;
    if (dto.feesMetaData !== undefined) patch.feesMetaData = dto.feesMetaData;
    if (dto.scholarshipMetaData !== undefined)
      patch.scholarshipMetaData = dto.scholarshipMetaData;

    if (dto.applicationDeadline !== undefined) {
      const iso =
        dto.applicationDeadline == null ? null : dmyToIso(dto.applicationDeadline);
      patch.applicationDeadline = iso == null ? null : new Date(`${iso}T00:00:00Z`);
    }

    return patch;
  }

  /**
   * Replaces the intake's scholarship row when name, type, or amount is in the
   * PATCH. Clearing the set deletes the row and leaves scholarshipMetaData alone.
   */
  private async applyScholarship(
    manager: EntityManager,
    courseIntakeId: string,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<void> {
    const touched =
      dto.scholarshipName !== undefined ||
      dto.scholarshipType !== undefined ||
      dto.scholarshipAmount !== undefined;
    if (!touched) return;

    const repo = manager.getRepository(CourseIntakeScholarships);
    const existing = await repo.find({
      where: { courseIntakeId, deletedAt: IsNull() },
      order: { createdAt: 'ASC' },
    });
    const next = mergedScholarship(existing[0] ?? null, dto);
    const filled = [next.hasName, next.hasType, next.hasAmount].filter(Boolean).length;
    if (filled !== 0 && filled !== 3) {
      throw new ValidationException(
        'scholarshipName, scholarshipType and scholarshipAmount must be provided together',
        {
          scholarshipName: ['Must be set or cleared with scholarshipType and scholarshipAmount'],
        },
      );
    }

    if (existing.length > 0) {
      await repo.softRemove(existing);
    }
    if (filled === 0 || next.name == null) return;

    await repo.save(
      repo.create({
        courseIntakeId,
        name: next.name,
        amountType: next.amountType ?? undefined,
        amount: next.amount ?? undefined,
        isActive: true,
      }),
    );
  }

  /**
   * Upserts or clears CourseEngReq rows for IELTS / PTE / TOEFL when those
   * fields appear in the PATCH. Keys off UniCourses.id (not the intake id).
   */
  private async applyEnglishRequirements(
    manager: EntityManager,
    uniCourseId: string,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<void> {
    const touched = ENGLISH_TESTS.filter((name) => {
      const overallKey = testHeader(name, 'Overall') as EnglishFieldKey;
      const sectionKey = testHeader(name, 'Section') as EnglishFieldKey;
      return dto[overallKey] !== undefined || dto[sectionKey] !== undefined;
    });
    if (touched.length === 0) return;

    const engRepo = manager.getRepository(CourseEngReq);
    const tests = await manager.getRepository(SysEnglishTests).find({
      where: { deletedAt: IsNull() },
    });
    const byName = new Map(
      tests.map((t) => [t.testName.trim().toUpperCase(), t]),
    );

    for (const name of touched) {
      await this.upsertEnglishTest(engRepo, byName, uniCourseId, name, dto);
    }
  }

  private async upsertEnglishTest(
    engRepo: Repository<CourseEngReq>,
    byName: Map<string, SysEnglishTests>,
    uniCourseId: string,
    name: EnglishTestName,
    dto: UpdateCrmCourseRequestDto,
  ): Promise<void> {
    const overallKey = testHeader(name, 'Overall') as EnglishFieldKey;
    const sectionKey = testHeader(name, 'Section') as EnglishFieldKey;
    const sysTest = byName.get(name);
    if (!sysTest) {
      throw new ValidationException(`${name} English test is not configured`, {
        [overallKey]: [`System English test "${name}" was not found`],
      });
    }

    const existing = await engRepo.findOne({
      where: { uniCourseId, sysEngTestId: sysTest.id, deletedAt: IsNull() },
    });

    const nextOverall =
      dto[overallKey] !== undefined
        ? dto[overallKey]
        : (existing?.minOverallReq ?? null);
    const nextSection =
      dto[sectionKey] !== undefined
        ? dto[sectionKey]
        : (existing?.minSectionReq ?? null);

    if (nextOverall == null) {
      if (existing) {
        await engRepo.softRemove(existing);
      }
      return;
    }

    if (sysTest.maxScore != null && Number(nextOverall) > Number(sysTest.maxScore)) {
      throw new ValidationException(
        `${name} overall cannot exceed ${sysTest.maxScore}`,
        {
          [overallKey]: [`Must be at most ${sysTest.maxScore}`],
        },
      );
    }
    if (
      nextSection != null &&
      sysTest.maxScore != null &&
      Number(nextSection) > Number(sysTest.maxScore)
    ) {
      throw new ValidationException(
        `${name} section cannot exceed ${sysTest.maxScore}`,
        {
          [sectionKey]: [`Must be at most ${sysTest.maxScore}`],
        },
      );
    }

    if (existing) {
      existing.minOverallReq = nextOverall;
      existing.minSectionReq = nextSection ?? undefined;
      await engRepo.save(existing);
      return;
    }

    await engRepo.save(
      engRepo.create({
        uniCourseId,
        sysEngTestId: sysTest.id,
        minOverallReq: nextOverall,
        ...(nextSection != null ? { minSectionReq: nextSection } : {}),
      }),
    );
  }
}
