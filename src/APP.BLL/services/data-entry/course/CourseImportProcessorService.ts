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
  parseJsonValue,
  parseRequiredDecimal,
} from './parsers/courseCsvFieldParsers';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

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
    const base = this.resultBuilder.flattenInputRow(row);

    const uniResult = await this.universityResolver.resolveUniversity(
      tm,
      row.uniName,
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
    );

    const award = await this.programmeDegreeResolver.findOrCreateDegree(
      tm,
      row.degreeName,
    );
    if ('error' in award) {
      return { error: this.resultBuilder.resolutionError(base, award.error) };
    }

    const minDeg = await this.programmeDegreeResolver.findOrCreateDegree(
      tm,
      row.minDegreeName,
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
      );
      if ('error' in hd) {
        return { error: this.resultBuilder.resolutionError(base, hd.error) };
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
    /** Bulk upload does not persist `intakeMetaData` (column ignored; set elsewhere if needed). */
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
}
