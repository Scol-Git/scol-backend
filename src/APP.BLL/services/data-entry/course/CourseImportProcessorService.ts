import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import type {
  CsvImportProcessor,
  CsvRow,
  CsvProcessingResult,
} from '../common/abstractions/CsvImportProcessor';
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
  CourseRowValidator,
  type ErrorCourseRow,
} from './validators/CourseRowValidator';
import { CourseUniversityResolverService } from './resolvers/CourseUniversityResolverService';
import { ProgrammeDegreeResolverService } from './resolvers/ProgrammeDegreeResolverService';
import { CourseRowResultBuilder } from './builders/CourseRowResultBuilder';
import { parseIntakeInfo } from './parsers/courseIntakeInfoParser';
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

@Injectable()
export class CourseImportProcessorService implements CsvImportProcessor {
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
        const universityCache = await this.universityResolver.buildCache(
          tm,
          chunk.map((row) => row.uniName),
        );
        const programmeCache = await this.programmeDegreeResolver.buildProgrammeCache(
          tm,
          chunk.map((row) => row.programmeName),
        );
        const degreeCache = await this.programmeDegreeResolver.buildDegreeCache(
          tm,
          chunk.flatMap((row) => [
            row.degreeName,
            row.minDegreeName,
            row.higherDegreeName ?? '',
          ]),
        );
        const engTestCache = await this.buildEngTestCache(tm);
        for (const row of chunk) {
          const base = this.resultBuilder.flattenInputRow(row);
          try {
            const result = await this.processOneRow(
              tm,
              row,
              universityCache,
              programmeCache,
              degreeCache,
              engTestCache,
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
    universityCache: Map<string, string[]>,
    programmeCache: Map<string, string>,
    degreeCache: Map<string, string>,
    engTestCache: Map<string, string>,
  ): Promise<{
    reviewed?: Record<string, string>;
    error?: ErrorCourseRow;
  }> {
    const base = this.resultBuilder.flattenInputRow(row);

    const uniResult = await this.universityResolver.resolveUniversity(
      tm,
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
    const existingCourse = await courseRepo.findOne({
      where: {
        uniId,
        sysProgrammeId: progResult.id,
        sysDegreeId: award.id,
        courseName: row.courseName.trim(),
      },
    });

    const arRaw = (row.AcademicRequirementsMetaData ?? '').trim();
    const reqMetaParsed = arRaw ? parseMetaDataItems(arRaw) : null;

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
      courseEntity.requirementMetaData = Array.isArray(reqMetaParsed)
        ? (reqMetaParsed as MetaDataItem[])
        : undefined;
    } else {
      courseEntity.requirementMetaData = undefined;
    }
    const ext = (row.courseUrlExternal ?? '').trim();
    courseEntity.externalUrl = ext || undefined;

    const savedCourse = await courseRepo.save(courseEntity);

    const intake = parseIntakeInfo(row.intakeInfo);
    if (!intake) {
      return {
        error: this.resultBuilder.resolutionError(
          base,
          formatImportError(
            ImportErrorCode.INVALID_FORMAT,
            'intakeInfo must be parseable (e.g. Sep-26 or Sep 2026)',
          ),
        ),
      };
    }
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

    const engRepo = tm.getRepository(CourseEngReq);
    const engTestRepo = tm.getRepository(SysEnglishTests);
    const existingReqs = await engRepo.find({
      where: { uniCourseId: savedCourse.id },
    });
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
    for (const req of untouchedReqs) {
      req.minOverallReq = undefined;
      req.minSectionReq = undefined;
    }
    if (untouchedReqs.length > 0) {
      await engRepo.save(untouchedReqs);
    }

    let scholarshipId = '';
    const schName = (row.scholarshipName ?? '').trim();
    const schRepo = tm.getRepository(CourseIntakeScholarships);
    if (schName) {
      const existingSch = await schRepo.findOne({
        where: { courseIntakeId: savedIntake.id, name: schName },
      });
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
      scholarshipId = savedSch.id;
      const otherActive = await schRepo.find({
        where: { courseIntakeId: savedIntake.id, isActive: true },
      });
      const otherToDeactivate = otherActive.filter(
        (item) => item.id !== savedSch.id,
      );
      for (const item of otherToDeactivate) {
        item.isActive = false;
      }
      if (otherToDeactivate.length > 0) {
        await schRepo.save(otherToDeactivate);
      }
    } else {
      const activeScholarships = await schRepo.find({
        where: { courseIntakeId: savedIntake.id, isActive: true },
      });
      for (const item of activeScholarships) {
        item.isActive = false;
      }
      if (activeScholarships.length > 0) {
        await schRepo.save(activeScholarships);
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
        courseIntakeId: savedIntake.id,
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
}
