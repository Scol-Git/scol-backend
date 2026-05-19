import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import type { CsvRow, CsvProcessingResult } from '../common/abstractions/CsvImportProcessor';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { UniCourses } from '@entity/entities/UniCourses.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { CourseEngReq } from '@entity/entities/CourseEngReq.entity';
import { MetaDataItem } from '@shared/types/MetaDataItem.type';
import { CourseIntakeScholarships } from '@entity/entities/CourseIntakeScholarships.entity';
import type { CourseImportConfig } from './CourseImportConfig';
import {
  CourseImportConfig as CourseImportConfigToken,
} from '@shared/tokens/injection.tokens';
import {
  type CourseCsvRow,
  normalizeCourseCsvRow,
  type ErrorCourseRow,
} from './dto/CourseImportRowTypes';
import { CourseRowValidator } from './validators/CourseRowValidator';
import { CourseUniversityResolverService } from './resolvers/CourseUniversityResolverService';
import { ProgrammeDegreeResolverService } from './resolvers/ProgrammeDegreeResolverService';
import { CourseRowResultBuilder } from './builders/CourseRowResultBuilder';
import { parseIntakeInfoList } from './parsers/courseIntakeInfoParser';
import {
  parseCourseDurationMonths,
  parseOptionalDecimal,
  parseOptionalDate,
} from './parsers/courseCsvFieldParsers';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import {
  formatImportError,
  ImportErrorCode,
} from '../common/abstractions/ImportErrorCode';
import { parseMetaDataItems } from '../common/engine/MetaDataParser';

const LOG_CONTEXT = '[BulkImport:Course:Processor]';

type CourseResolutionCaches = {
  universityCache: Map<string, string[]>;
  programmeCache: Map<string, string>;
  degreeCache: Map<string, string>;
  engTestCache: Map<string, string>;
};

@Injectable()
export class CourseImportProcessorService {
  constructor(
    private readonly validator: CourseRowValidator,
    private readonly universityResolver: CourseUniversityResolverService,
    private readonly programmeDegreeResolver: ProgrammeDegreeResolverService,
    private readonly resultBuilder: CourseRowResultBuilder,
    @Inject(CourseImportConfigToken) private readonly importConfig: CourseImportConfig,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async processRows(
    manager: EntityManager,
    rows: CsvRow[],
  ): Promise<CsvProcessingResult> {
    const courseRows = rows.map(normalizeCourseCsvRow);
    const { valid, invalid: validationErrors } =
      this.partitionValidatedRows(courseRows);
    const caches = await this.prefetchResolutionCaches(manager, valid);
    const { reviewedRows, resolutionErrors } =
      await this.processValidRowsInBatches(manager, valid, caches);

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

  private partitionValidatedRows(rows: CourseCsvRow[]): {
    valid: CourseCsvRow[];
    invalid: ErrorCourseRow[];
  } {
    const { valid, invalid: validationErrors } = this.validator.validateRows(rows);
    if (validationErrors.length > 0) {
      this.logger.info(
        `${LOG_CONTEXT} Validation: ${validationErrors.length} row(s) failed (required fields or format)`,
      );
    }
    return { valid, invalid: validationErrors };
  }

  /**
   * One-shot prefetch on the transaction manager. Same Map instances are passed through all
   * chunks so findOrCreate* / new SysEnglishTests rows keep caches warm for the whole import.
   */
  private async prefetchResolutionCaches(
    manager: EntityManager,
    valid: CourseCsvRow[],
  ): Promise<CourseResolutionCaches> {
    const universityCache = await this.universityResolver.buildCache(
      manager,
      valid.map((r) => r.uniName),
    );
    const programmeCache = await this.programmeDegreeResolver.buildProgrammeCache(
      manager,
      valid.map((r) => r.programmeName),
    );
    const degreeCache = await this.programmeDegreeResolver.buildDegreeCache(
      manager,
      valid.flatMap((r) => [
        r.degreeName,
        r.minDegreeName,
        r.higherDegreeName ?? '',
      ]),
    );
    const engTestCache = await this.buildEngTestCache(manager);
    return { universityCache, programmeCache, degreeCache, engTestCache };
  }

  private async processValidRowsInBatches(
    manager: EntityManager,
    valid: CourseCsvRow[],
    caches: CourseResolutionCaches,
  ): Promise<{
    reviewedRows: Array<Record<string, string>>;
    resolutionErrors: ErrorCourseRow[];
  }> {
    const reviewedRows: Array<Record<string, string>> = [];
    const resolutionErrors: ErrorCourseRow[] = [];
    const batchSize = Math.max(1, this.importConfig.batchSize);
    this.logger.info(
      `${LOG_CONTEXT} Processing ${valid.length} valid row(s) in batch(es) of ${batchSize}`,
    );

    const { universityCache, programmeCache, degreeCache, engTestCache } = caches;

    for (let i = 0; i < valid.length; i += batchSize) {
      const chunk = valid.slice(i, i + batchSize);
      const batchCache = await this.buildBatchCache(
        manager,
        chunk,
        universityCache,
        programmeCache,
        degreeCache,
      );
      for (const row of chunk) {
        const base = this.resultBuilder.flattenInputRow(row);
        try {
          const result = await this.processOneRow(
            manager,
            row,
            universityCache,
            programmeCache,
            degreeCache,
            engTestCache,
            batchCache,
          );
          if (result.error) {
            resolutionErrors.push(result.error);
          } else if (result.reviewed) {
            reviewedRows.push(result.reviewed);
          }
        } catch (error) {
          const message =
            error instanceof Error ? error.message : 'Unhandled row processing error';
          this.logger.error(
            `${LOG_CONTEXT} Unexpected row failure for course "${(row.courseName ?? '').trim()}": ${message}`,
          );
          resolutionErrors.push(
            this.resultBuilder.resolutionError(
              base,
              formatImportError(ImportErrorCode.UNEXPECTED_ERROR, message),
            ),
          );
        }
      }
    }

    return { reviewedRows, resolutionErrors };
  }

  private async processOneRow(
    tm: EntityManager,
    row: CourseCsvRow,
    universityCache: Map<string, string[]>,
    programmeCache: Map<string, string>,
    degreeCache: Map<string, string>,
    engTestCache: Map<string, string>,
    batchCache: CourseBatchCache,
  ): Promise<{
    reviewed?: Record<string, string>;
    error?: ErrorCourseRow;
  }> {
    const base = this.resultBuilder.flattenInputRow(row);

    const uniResult = await this.universityResolver.resolveUniversity(
      row.uniName,
      universityCache,
    );
    if ('error' in uniResult) {
      return {
        error: this.resultBuilder.resolutionError(base, uniResult.error),
      };
    }
    const uniId = uniResult.uniId;

    const progResult = await this.programmeDegreeResolver.findOrCreateProgramme(
      tm,
      row.programmeName,
      programmeCache,
    );

    const award = await this.programmeDegreeResolver.findOrCreateDegree(
      tm,
      row.degreeName,
      degreeCache,
    );
    if ('error' in award) {
      return { error: this.resultBuilder.resolutionError(base, award.error) };
    }

    const minDeg = await this.programmeDegreeResolver.findOrCreateDegree(
      tm,
      row.minDegreeName,
      degreeCache,
    );
    if ('error' in minDeg) {
      return {
        error: this.resultBuilder.resolutionError(base, minDeg.error),
      };
    }

    let higherSysDegreeId: string | undefined;
    const hName = (row.higherDegreeName ?? '').trim();
    if (hName) {
      const hd = await this.programmeDegreeResolver.findOrCreateDegree(
        tm,
        hName,
        degreeCache,
      );
      if ('error' in hd) {
        return { error: this.resultBuilder.resolutionError(base, hd.error) };
      }
      higherSysDegreeId = hd.id;
    }

    const minGpaStr = row.minGpa.trim();
    let higherGpaStr: string | undefined;
    if (hName) {
      const higherRaw = (row.higherGpa ?? '').trim();
      higherGpaStr = higherRaw || undefined;
    }

    const courseRepo = tm.getRepository(UniCourses);
    const courseName = row.courseName.trim();
    const courseCacheKey = this.makeCourseKey(
      uniId,
      progResult.id,
      award.id,
      courseName,
    );
    const existingCourse = batchCache.courseByKey.get(courseCacheKey) ?? null;

    const arRaw = (row.AcademicRequirementsMetaData ?? '').trim();
    const reqMetaParsed = arRaw ? parseMetaDataItems(arRaw) : null;

    const courseEntity = existingCourse ?? courseRepo.create();
    courseEntity.uniId = uniId;
    courseEntity.sysProgrammeId = progResult.id;
    courseEntity.sysDegreeId = award.id;
    courseEntity.courseName = courseName;
    courseEntity.minSysDegreeId = minDeg.id;
    courseEntity.minGpa = minGpaStr;
    courseEntity.higherSysDegreeId = higherSysDegreeId;
    courseEntity.higherGpa = higherGpaStr;
    if (arRaw) {
      courseEntity.requirementMetaData = Array.isArray(reqMetaParsed)
        ? (reqMetaParsed as MetaDataItem[])
        : undefined;
    } else {
      courseEntity.requirementMetaData = undefined;
    }
    const ext = (row.courseUrlExternal ?? '').trim();
    courseEntity.externalUrl = ext || undefined;

    const savedCourse = await courseRepo.save(courseEntity);
    batchCache.courseByKey.set(courseCacheKey, savedCourse);

    const intakes = parseIntakeInfoList(row.intakeInfo);
    if (intakes.length === 0) {
      return {
        error: this.resultBuilder.resolutionError(
          base,
          formatImportError(
            ImportErrorCode.INVALID_FORMAT,
            'intakeInfo must be parseable (e.g. Sep-26, Dec-26 or Sep 2026)',
          ),
        ),
      };
    }
    const intakeRepo = tm.getRepository(UniCourseIntakes);
    const savedIntakes: UniCourseIntakes[] = [];
    for (const intake of intakes) {
      const intakeCacheKey = this.makeIntakeKey(
        savedCourse.id,
        intake.month,
        intake.year,
      );
      const existingIntake = batchCache.intakeByKey.get(intakeCacheKey) ?? null;

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
      /** Bulk upload does not persist `intakeMetaData` (column ignored; set elsewhere if needed). */
      const fm = (row.feesMetaData ?? '').trim();
      if (fm) {
        const parsed = parseMetaDataItems(fm);
        if (Array.isArray(parsed)) {
          intakeEntity.feesMetaData = parsed as MetaDataItem[];
        }
      } else {
        intakeEntity.feesMetaData = undefined;
      }

      const sm = (row.scholarshipMetaData ?? '').trim();
      if (sm) {
        const parsed = parseMetaDataItems(sm);
        if (Array.isArray(parsed)) {
          intakeEntity.scholarshipMetaData = parsed as MetaDataItem[];
        }
      } else {
        intakeEntity.scholarshipMetaData = undefined;
      }
      intakeEntity.isActive = true;

      const savedIntake = await intakeRepo.save(intakeEntity);
      batchCache.intakeByKey.set(intakeCacheKey, savedIntake);
      savedIntakes.push(savedIntake);
    }

    const primaryIntake = savedIntakes[0]!;

    const engRepo = tm.getRepository(CourseEngReq);
    const engTestRepo = tm.getRepository(SysEnglishTests);
    const existingReqs = batchCache.engReqByCourseId.get(savedCourse.id) ?? [];
    const existingReqMap = new Map(
      existingReqs.map((item) => [item.sysEngTestId, item]),
    );

    let sysEngTestIdIelts = '';
    let courseEngReqIdIelts = '';
    let sysEngTestIdToefl = '';
    let courseEngReqIdToefl = '';
    let sysEngTestIdPte = '';
    let courseEngReqIdPte = '';
    const touchedEngTestIds = new Set<string>();

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

      const cacheKey = testName.toUpperCase();
      let testId = engTestCache.get(cacheKey);
      if (!testId) {
        const createdTest = await engTestRepo.save(engTestRepo.create({ testName }));
        testId = createdTest.id;
        engTestCache.set(cacheKey, testId);
      }

      const existingReq = existingReqMap.get(testId);
      const req =
        existingReq ??
        engRepo.create({
          uniCourseId: savedCourse.id,
          sysEngTestId: testId,
        });
      req.minOverallReq = o !== '' ? parseOptionalDecimal(o) : undefined;
      req.minSectionReq = s !== '' ? parseOptionalDecimal(s) : undefined;
      const savedReq = await engRepo.save(req);
      if (!existingReqMap.has(testId)) {
        const list = batchCache.engReqByCourseId.get(savedCourse.id) ?? [];
        list.push(savedReq);
        batchCache.engReqByCourseId.set(savedCourse.id, list);
      }
      existingReqMap.set(testId, savedReq);
      touchedEngTestIds.add(testId);

      if (t.testName === 'IELTS') {
        sysEngTestIdIelts = testId;
        courseEngReqIdIelts = savedReq.id;
      } else if (t.testName === 'TOEFL') {
        sysEngTestIdToefl = testId;
        courseEngReqIdToefl = savedReq.id;
      } else {
        sysEngTestIdPte = testId;
        courseEngReqIdPte = savedReq.id;
      }
    }
    const untouchedReqs = existingReqs.filter(
      (item) => !touchedEngTestIds.has(item.sysEngTestId),
    );
    if (untouchedReqs.length > 0) {
      await engRepo.remove(untouchedReqs);
      batchCache.engReqByCourseId.set(
        savedCourse.id,
        (batchCache.engReqByCourseId.get(savedCourse.id) ?? []).filter(
          (item) => !untouchedReqs.some((removed) => removed.id === item.id),
        ),
      );
    }

    let scholarshipId = '';
    const schName = (row.scholarshipName ?? '').trim();
    const schRepo = tm.getRepository(CourseIntakeScholarships);
    if (schName) {
      for (const savedIntake of savedIntakes) {
        const scholarshipCacheKey = this.makeScholarshipKey(savedIntake.id, schName);
        const existingSch =
          batchCache.scholarshipByKey.get(scholarshipCacheKey) ?? null;
        const sch =
          existingSch ??
          schRepo.create({
            courseIntakeId: savedIntake.id,
            name: schName,
          });
        sch.amount = parseOptionalDecimal(row.scholarshipAmount ?? '');
        sch.amountType = (row.scholarshipType ?? '').trim() || undefined;
        sch.isActive = true;
        const savedSch = await schRepo.save(sch);
        batchCache.scholarshipByKey.set(scholarshipCacheKey, savedSch);
        if (!scholarshipId) scholarshipId = savedSch.id;
      }
    }

    return {
      reviewed: this.resultBuilder.reviewed(base, {
        uniId,
        sysProgrammeId: progResult.id,
        sysDegreeId: award.id,
        minSysDegreeId: minDeg.id,
        higherSysDegreeId: higherSysDegreeId ?? '',
        uniCourseId: savedCourse.id,
        courseIntakeId: primaryIntake.id,
        sysEngTestIdIelts,
        courseEngReqIdIelts,
        sysEngTestIdToefl,
        courseEngReqIdToefl,
        sysEngTestIdPte,
        courseEngReqIdPte,
        scholarshipId,
      }),
    };
  }

  private async buildEngTestCache(tm: EntityManager): Promise<Map<string, string>> {
    const tests = await tm.getRepository(SysEnglishTests).find();
    return new Map(
      tests.map((test) => [test.testName.toUpperCase(), test.id]),
    );
  }

  private async buildBatchCache(
    tm: EntityManager,
    chunk: CourseCsvRow[],
    universityCache: Map<string, string[]>,
    programmeCache: Map<string, string>,
    degreeCache: Map<string, string>,
  ): Promise<CourseBatchCache> {
    const courseRepo = tm.getRepository(UniCourses);
    const intakeRepo = tm.getRepository(UniCourseIntakes);
    const engRepo = tm.getRepository(CourseEngReq);
    const schRepo = tm.getRepository(CourseIntakeScholarships);

    const courseByKey = new Map<string, UniCourses>();
    const intakeByKey = new Map<string, UniCourseIntakes>();
    const engReqByCourseId = new Map<string, CourseEngReq[]>();
    const scholarshipByKey = new Map<string, CourseIntakeScholarships>();

    const courseLookupKeys = chunk
      .map((row) => {
        const uniIds = universityCache.get(row.uniName.trim().toLowerCase()) ?? [];
        const progId = programmeCache.get(row.programmeName.trim().toLowerCase());
        const degreeId = degreeCache.get(row.degreeName.trim().toLowerCase());
        if (uniIds.length !== 1 || !progId || !degreeId) return null;
        return {
          uniId: uniIds[0],
          sysProgrammeId: progId,
          sysDegreeId: degreeId,
          courseName: row.courseName.trim(),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    if (courseLookupKeys.length > 0) {
      const uniIds = [...new Set(courseLookupKeys.map((k) => k.uniId))];
      const courseNames = [
        ...new Set(courseLookupKeys.map((k) => k.courseName.toLowerCase())),
      ];
      const allCourses = await courseRepo
        .createQueryBuilder('c')
        .where('c.uniId IN (:...uniIds)', { uniIds })
        .andWhere('LOWER(c.courseName) IN (:...courseNames)', { courseNames })
        .getMany();
      const allowed = new Set(
        courseLookupKeys.map((k) =>
          this.makeCourseKey(k.uniId, k.sysProgrammeId, k.sysDegreeId, k.courseName),
        ),
      );
      for (const course of allCourses) {
        const key = this.makeCourseKey(
          course.uniId,
          course.sysProgrammeId,
          course.sysDegreeId,
          course.courseName,
        );
        if (allowed.has(key)) {
          courseByKey.set(key, course);
        }
      }
    }

    const existingCourseIds = [...new Set([...courseByKey.values()].map((c) => c.id))];
    if (existingCourseIds.length > 0) {
      const [allIntakes, allEngReqs] = await Promise.all([
        intakeRepo
          .createQueryBuilder('i')
          .where('i.uniCourseId IN (:...ids)', { ids: existingCourseIds })
          .getMany(),
        engRepo
          .createQueryBuilder('e')
          .where('e.uniCourseId IN (:...ids)', { ids: existingCourseIds })
          .getMany(),
      ]);

      for (const intake of allIntakes) {
        intakeByKey.set(
          this.makeIntakeKey(intake.uniCourseId, intake.intakeMonth, intake.intakeYear),
          intake,
        );
      }
      for (const req of allEngReqs) {
        const list = engReqByCourseId.get(req.uniCourseId) ?? [];
        list.push(req);
        engReqByCourseId.set(req.uniCourseId, list);
      }
    }

    const existingIntakeIds = [...new Set([...intakeByKey.values()].map((i) => i.id))];
    if (existingIntakeIds.length > 0) {
      const allScholarships = await schRepo
        .createQueryBuilder('s')
        .where('s.courseIntakeId IN (:...ids)', { ids: existingIntakeIds })
        .getMany();
      for (const scholarship of allScholarships) {
        scholarshipByKey.set(
          this.makeScholarshipKey(scholarship.courseIntakeId, scholarship.name),
          scholarship,
        );
      }
    }

    return {
      courseByKey,
      intakeByKey,
      engReqByCourseId,
      scholarshipByKey,
    };
  }

  private makeCourseKey(
    uniId: string,
    programmeId: string,
    degreeId: string,
    courseName: string,
  ): string {
    return `${uniId}::${programmeId}::${degreeId}::${courseName.trim().toLowerCase()}`;
  }

  private makeIntakeKey(
    uniCourseId: string,
    intakeMonth: number,
    intakeYear: number,
  ): string {
    return `${uniCourseId}::${intakeMonth}::${intakeYear}`;
  }

  private makeScholarshipKey(courseIntakeId: string, scholarshipName: string): string {
    return `${courseIntakeId}::${scholarshipName.trim().toLowerCase()}`;
  }
}

interface CourseBatchCache {
  // key: `${uniId}::${sysProgrammeId}::${sysDegreeId}::${courseName.toLowerCase()}`
  courseByKey: Map<string, UniCourses>;
  // key: `${uniCourseId}::${intakeMonth}::${intakeYear}`
  intakeByKey: Map<string, UniCourseIntakes>;
  // key: uniCourseId -> all CourseEngReq rows for that course
  engReqByCourseId: Map<string, CourseEngReq[]>;
  // key: `${courseIntakeId}::${name.toLowerCase()}`
  scholarshipByKey: Map<string, CourseIntakeScholarships>;
}
