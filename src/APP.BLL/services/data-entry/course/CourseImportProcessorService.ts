import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import type {
  CsvImportProcessor,
  CsvRow,
  CsvProcessingResult,
} from '../common/abstractions/CsvImportProcessor';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { UniCourses } from '@entity/entities/UniCourses.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { CourseEngReq } from '@entity/entities/CourseEngReq.entity';
import { CourseIntakeScholarships } from '@entity/entities/CourseIntakeScholarships.entity';
import { COURSE_DEGREE_LEVEL_ORDER } from './course-degree-level-order';
import { CourseImportSchema } from './CourseImportSchema';
import type { CourseImportConfig } from './CourseImportConfig';
import {
  CourseImportConfig as CourseImportConfigToken,
} from '@shared/tokens/injection.tokens';
import { CourseRowValidator, type ErrorCourseRow } from './validators/CourseRowValidator';
import { parseIntakeInfo } from './parsers/courseIntakeInfoParser';
import {
  parseCourseDurationMonths,
  parseOptionalDecimal,
  parseOptionalDate,
  parseJsonValue,
  parseRequiredDecimal,
} from './parsers/courseCsvFieldParsers';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

const LOG_CONTEXT = '[BulkImport:Course:Processor]';

function normalizeDegreeKey(name: string): string {
  return name.trim().toUpperCase().replace(/\s+/g, ' ');
}

@Injectable()
export class CourseImportProcessorService implements CsvImportProcessor {
  constructor(
    private readonly validator: CourseRowValidator,
    @Inject(CourseImportConfigToken) private readonly importConfig: CourseImportConfig,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async processRows(
    manager: EntityManager,
    rows: CsvRow[],
  ): Promise<CsvProcessingResult> {
    const { valid, invalid: validationErrors } = this.validator.validateRows(rows);
    if (validationErrors.length > 0) {
      this.logger.info(
        `${LOG_CONTEXT} Validation: ${validationErrors.length} row(s) failed (required fields or format)`,
      );
    }

    const reviewedRows: Array<Record<string, string>> = [];
    const resolutionErrors: ErrorCourseRow[] = [];

    const batchSize = Math.max(1, this.importConfig.batchSize);
    this.logger.info(
      `${LOG_CONTEXT} Processing ${valid.length} valid row(s) in batch(es) of ${batchSize}`,
    );
    for (let i = 0; i < valid.length; i += batchSize) {
      const chunk = valid.slice(i, i + batchSize);
      await manager.connection.transaction(async (tm) => {
        for (const row of chunk) {
          const result = await this.processOneRow(tm, row);
          if (result.error) {
            resolutionErrors.push(result.error);
          } else if (result.reviewed) {
            reviewedRows.push(result.reviewed);
          }
        }
      });
    }

    const errTotal = validationErrors.length + resolutionErrors.length;
    this.logger.info(
      `${LOG_CONTEXT} Processed: ${reviewedRows.length} reviewed, ${errTotal} errors` +
        (errTotal > 0
          ? ` (${validationErrors.length} validation, ${resolutionErrors.length} resolution)`
          : ''),
    );

    return {
      reviewedRows:
        reviewedRows as unknown as CsvProcessingResult['reviewedRows'],
      errorRows: [
        ...validationErrors,
        ...resolutionErrors,
      ] as unknown as CsvProcessingResult['errorRows'],
    };
  }

  private async processOneRow(
    tm: EntityManager,
    row: CsvRow,
  ): Promise<{
    reviewed?: Record<string, string>;
    error?: ErrorCourseRow;
  }> {
    const base = this.flattenRowToStrings(row);

    const uniResult = await this.resolveUniversity(tm, row.uniName);
    if ('error' in uniResult) {
      return { error: { ...base, errorReason: uniResult.error } };
    }
    const uniId = uniResult.uniId;

    const progResult = await this.findOrCreateProgramme(tm, row.programmeName);
    if ('error' in progResult) {
      return { error: { ...base, errorReason: progResult.error } };
    }

    const award = await this.findOrCreateDegree(tm, row.degreeName);
    if ('error' in award) {
      return { error: { ...base, errorReason: award.error } };
    }
    const minDeg = await this.findOrCreateDegree(tm, row.minDegreeName);
    if ('error' in minDeg) {
      return { error: { ...base, errorReason: minDeg.error } };
    }

    let higherSysDegreeId: string | undefined;
    const hName = (row.higherDegreeName ?? '').trim();
    if (hName) {
      const hd = await this.findOrCreateDegree(tm, hName);
      if ('error' in hd) {
        return { error: { ...base, errorReason: hd.error } };
      }
      higherSysDegreeId = hd.id;
    }

    const minGpaNum = parseRequiredDecimal(row.minGpa)!;
    const minGpaStr = String(minGpaNum);
    let higherGpaStr: string | undefined;
    if (hName) {
      higherGpaStr = String(parseRequiredDecimal(row.higherGpa)!);
    }

    const courseRepo = tm.getRepository(UniCourses);
    const existingCourse = await courseRepo.findOne({
      where: {
        uniId,
        sysProgrammeId: progResult.id,
        sysDegreeId: award.id,
        courseName: row.courseName.trim(),
      },
    });

    const arRaw = (row.AcademicRequirementsMetaData ?? '').trim();
    const reqMetaParsed = arRaw
      ? parseJsonValue(row.AcademicRequirementsMetaData)
      : null;

    const courseEntity = existingCourse ?? courseRepo.create();
    courseEntity.uniId = uniId;
    courseEntity.sysProgrammeId = progResult.id;
    courseEntity.sysDegreeId = award.id;
    courseEntity.courseName = row.courseName.trim();
    courseEntity.minSysDegreeId = minDeg.id;
    courseEntity.minGpa = minGpaStr;
    courseEntity.higherSysDegreeId = higherSysDegreeId;
    courseEntity.higherGpa = higherGpaStr;
    if (arRaw) {
      courseEntity.requirementMetaData =
        reqMetaParsed === null
          ? undefined
          : (reqMetaParsed as unknown as Record<string, unknown>);
    } else {
      courseEntity.requirementMetaData = undefined;
    }
    const ext = (row.courseUrlExternal ?? '').trim();
    courseEntity.externalUrl = ext || undefined;

    const savedCourse = await courseRepo.save(courseEntity);

    const intake = parseIntakeInfo(row.intakeInfo)!;
    const intakeRepo = tm.getRepository(UniCourseIntakes);
    const existingIntake = await intakeRepo.findOne({
      where: {
        uniCourseId: savedCourse.id,
        intakeMonth: intake.month,
        intakeYear: intake.year,
      },
    });

    const intakeEntity = existingIntake ?? intakeRepo.create();
    intakeEntity.uniCourseId = savedCourse.id;
    intakeEntity.intakeMonth = intake.month;
    intakeEntity.intakeYear = intake.year;
    const dur = parseCourseDurationMonths(row.courseDuration);
    if (dur !== null) {
      intakeEntity.courseDuration = dur;
    }
    intakeEntity.applicationDeadline = parseOptionalDate(
      row.applicationDeadline ?? '',
    );
    intakeEntity.tuitionFee = parseOptionalDecimal(row.tuitionFee ?? '');
    intakeEntity.currency = (row.currency ?? '').trim() || undefined;
    intakeEntity.initialDeposit = parseOptionalDecimal(row.initialDeposit ?? '');
    intakeEntity.applicationFee = parseOptionalDecimal(row.applicationFee ?? '');
    const im = (row.intakeMetaData ?? '').trim();
    if (im) {
      const o = parseJsonValue(im);
      if (o !== null && typeof o === 'object' && !Array.isArray(o)) {
        intakeEntity.intakeMetaData = o as Record<string, unknown>;
      }
    }
    const fm = (row.feesMetaData ?? '').trim();
    if (fm) {
      const o = parseJsonValue(fm);
      if (o !== null && typeof o === 'object' && !Array.isArray(o)) {
        intakeEntity.feesMetaData = o as Record<string, unknown>;
      }
    }
    intakeEntity.isActive = true;

    const savedIntake = await intakeRepo.save(intakeEntity);

    await tm.getRepository(CourseEngReq).delete({
      uniCourseId: savedCourse.id,
    });

    const engRepo = tm.getRepository(CourseEngReq);
    const engTestRepo = tm.getRepository(SysEnglishTests);

    let sysEngTestIdIelts = '';
    let courseEngReqIdIelts = '';
    let sysEngTestIdToefl = '';
    let courseEngReqIdToefl = '';
    let sysEngTestIdPte = '';
    let courseEngReqIdPte = '';

    const tests: Array<{
      testName: 'IELTS' | 'TOEFL' | 'PTE';
      overall: string;
      section: string;
    }> = [
      {
        testName: 'IELTS',
        overall: row.ieltsMinOverall ?? '',
        section: row.ieltsMinSection ?? '',
      },
      {
        testName: 'TOEFL',
        overall: row.toeflMinOverall ?? '',
        section: row.toeflMinSection ?? '',
      },
      {
        testName: 'PTE',
        overall: row.pteMinOverall ?? '',
        section: row.pteMinSection ?? '',
      },
    ];

    for (const t of tests) {
      const o = (t.overall ?? '').trim();
      const s = (t.section ?? '').trim();
      if (o === '' && s === '') continue;

      const testName = t.testName;

      let testEnt = await engTestRepo
        .createQueryBuilder('e')
        .where('LOWER(e.testName) = LOWER(:n)', { n: testName })
        .getOne();

      if (!testEnt) {
        testEnt = engTestRepo.create({ testName });
        await engTestRepo.save(testEnt);
      }

      const req = engRepo.create({
        uniCourseId: savedCourse.id,
        sysEngTestId: testEnt.id,
        minOverallReq: o !== '' ? parseOptionalDecimal(o) : undefined,
        minSectionReq: s !== '' ? parseOptionalDecimal(s) : undefined,
      });
      const savedReq = await engRepo.save(req);

      if (t.testName === 'IELTS') {
        sysEngTestIdIelts = testEnt.id;
        courseEngReqIdIelts = savedReq.id;
      } else if (t.testName === 'TOEFL') {
        sysEngTestIdToefl = testEnt.id;
        courseEngReqIdToefl = savedReq.id;
      } else {
        sysEngTestIdPte = testEnt.id;
        courseEngReqIdPte = savedReq.id;
      }
    }

    await tm.getRepository(CourseIntakeScholarships).delete({
      courseIntakeId: savedIntake.id,
    });

    let scholarshipId = '';
    const schName = (row.scholarshipName ?? '').trim();
    if (schName) {
      const schRepo = tm.getRepository(CourseIntakeScholarships);
      const sch = schRepo.create({
        courseIntakeId: savedIntake.id,
        name: schName,
        amount: parseOptionalDecimal(row.scholarshipAmount ?? ''),
        amountType: (row.scholarshipType ?? '').trim() || undefined,
        scholarshipMetaData: undefined,
        isActive: true,
      });
      const sm = (row.scholarshipMetaData ?? '').trim();
      if (sm) {
        const o = parseJsonValue(sm);
        if (o !== null && typeof o === 'object' && !Array.isArray(o)) {
          sch.scholarshipMetaData = o as Record<string, unknown>;
        }
      }
      const savedSch = await schRepo.save(sch);
      scholarshipId = savedSch.id;
    }

    return {
      reviewed: {
        ...base,
        uniId,
        sysProgrammeId: progResult.id,
        sysDegreeId: award.id,
        minSysDegreeId: minDeg.id,
        higherSysDegreeId: higherSysDegreeId ?? '',
        uniCourseId: savedCourse.id,
        courseIntakeId: savedIntake.id,
        sysEngTestIdIelts,
        courseEngReqIdIelts,
        sysEngTestIdToefl,
        courseEngReqIdToefl,
        sysEngTestIdPte,
        courseEngReqIdPte,
        scholarshipId,
      },
    };
  }

  private flattenRowToStrings(row: CsvRow): Record<string, string> {
    const out: Record<string, string> = {};
    for (const h of CourseImportSchema.inputHeaders) {
      out[h] = row[h] ?? '';
    }
    return out;
  }

  private async resolveUniversity(
    tm: EntityManager,
    uniNameRaw: string,
  ): Promise<{ uniId: string } | { error: string }> {
    const name = uniNameRaw.trim();
    const list = await tm
      .createQueryBuilder(SysUniversities, 'u')
      .where('TRIM(u.uniName) = TRIM(:name)', { name })
      .getMany();

    if (list.length === 0) {
      return { error: `University not found for uniName: "${name}"` };
    }
    if (list.length > 1) {
      return {
        error: `Ambiguous uniName: multiple universities match "${name}"`,
      };
    }
    return { uniId: list[0].id };
  }

  private async findOrCreateProgramme(
    tm: EntityManager,
    nameRaw: string,
  ): Promise<{ id: string } | { error: string }> {
    const name = nameRaw.trim();
    const repo = tm.getRepository(SysProgrammes);
    const existing = await repo
      .createQueryBuilder('p')
      .where('LOWER(TRIM(p.name)) = LOWER(TRIM(:n))', { n: name })
      .getOne();
    if (existing) return { id: existing.id };
    const created = repo.create({ name });
    await repo.save(created);
    return { id: created.id };
  }

  private async findOrCreateDegree(
    tm: EntityManager,
    nameRaw: string,
  ): Promise<{ id: string } | { error: string }> {
    const name = nameRaw.trim();
    if (!name) {
      return { error: 'degree name is empty' };
    }
    const repo = tm.getRepository(SysAcademicDegrees);
    const existing = await repo
      .createQueryBuilder('d')
      .where('LOWER(TRIM(d.degreeName)) = LOWER(TRIM(:n))', { n: name })
      .getOne();
    if (existing) return { id: existing.id };

    const key = normalizeDegreeKey(name);
    const levelOrder = COURSE_DEGREE_LEVEL_ORDER[key];
    if (levelOrder === undefined) {
      return {
        error: `Unknown degree "${name}" for insert — add "${key}" to course-degree-level-order.ts`,
      };
    }

    const created = repo.create({
      degreeName: name,
      levelOrder,
    });
    await repo.save(created);
    return { id: created.id };
  }
}
