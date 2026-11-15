import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import {
  type BulkImportHandler,
  type ChunkOutcome,
  type RowValidation,
  type SourceRow,
  type ValidRow,
} from '../common/BulkImportHandler';
import { ImportErrorCode, type RowIssue } from '../common/ImportErrorCode';
import { cleanName, normName } from '../common/normName';
import { hasError, validateCells } from '../schema/RowValidator';
import { COURSE_SCHEMA } from './course.schema';
import {
  ENGLISH_TESTS,
  testHeader,
  type CourseCtx,
  type EnglishTestName,
} from './courseContext';
import { CourseDraftWriter } from './CourseDraftWriter';
import { intakeKey, type ParsedIntake } from './intakeInfoParser';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const distinct = <T>(items: T[]): T[] => [...new Set(items)];
const strOrNull = (v: unknown): string | null => (typeof v === 'string' ? v : null);

@Injectable()
export class CourseImportHandler implements BulkImportHandler<CourseCtx> {
  readonly type = BulkImportType.COURSE;
  readonly schema = COURSE_SCHEMA;

  constructor(private readonly writer: CourseDraftWriter) {}

  validate(row: SourceRow, now: Date): RowValidation {
    const { values, issues } = validateCells(COURSE_SCHEMA, row.raw);
    const error = (column: string, message: string) =>
      issues.push({ severity: 'ERROR', code: ImportErrorCode.INVALID_FORMAT, column, message });

    if (values.minGpa != null && values.minDegreeName == null) error('minGpa', 'minGpa requires minDegreeName');
    if (values.higherGpa != null && values.higherDegreeName == null) error('higherGpa', 'higherGpa requires higherDegreeName');

    const sch = ['scholarshipName', 'scholarshipType', 'scholarshipAmount'];
    const given = sch.filter((h) => values[h] != null);
    if (given.length > 0 && given.length < sch.length) {
      error(sch.find((h) => values[h] == null) as string, 'scholarshipName, scholarshipType and scholarshipAmount must be given together');
    }

    for (const t of ENGLISH_TESTS) {
      if (values[testHeader(t, 'Section')] != null && values[testHeader(t, 'Overall')] == null) {
        error(testHeader(t, 'Section'), `${testHeader(t, 'Section')} requires ${testHeader(t, 'Overall')}`);
      }
    }

    const nowKey = now.getUTCFullYear() * 12 + (now.getUTCMonth() + 1);
    const intakes = (values.intakeInfo as ParsedIntake[] | null) ?? [];
    for (const i of intakes) {
      if (intakeKey(i) < nowKey) {
        issues.push({
          severity: 'ERROR',
          code: ImportErrorCode.INTAKE_IN_PAST,
          column: 'intakeInfo',
          message: `${MONTH_NAMES[i.month - 1]} ${i.year} is in the past`,
        });
      }
    }

    if (hasError(issues)) return { issues };
    return {
      valid: { rowNumber: row.rowNumber, raw: row.raw, values, issues: [...issues] },
      issues,
    };
  }

  naturalKey(row: ValidRow): string {
    const v = row.values;
    return `${normName(v.uniName as string)}|${normName(v.courseName as string)}|${normName(v.degreeName as string)}`;
  }

  async prefetch(rows: ValidRow[], em: EntityManager): Promise<CourseCtx> {
    const uniNames = distinct(rows.map((r) => normName(r.values.uniName as string)));
    const progNames = distinct(rows.map((r) => normName(r.values.programmeName as string)));

    const [uniRows, progRows, degreeRows, testRows] = (await Promise.all([
      em.query(`SELECT id, lower(trim("uniName")) AS k FROM "sys_Universities" WHERE "deletedAt" IS NULL AND lower(trim("uniName")) = ANY($1::text[])`, [uniNames]),
      em.query(`SELECT id, lower(trim("name")) AS k FROM "sys_Programmes" WHERE "deletedAt" IS NULL AND lower(trim("name")) = ANY($1::text[])`, [progNames]),
      em.query(`SELECT id, lower(trim("degreeName")) AS k FROM "sys_AcademicDegrees" WHERE "deletedAt" IS NULL`),
      em.query(`SELECT id, upper(trim("testName")) AS k, "maxScore" FROM "sys_EnglishTests" WHERE "deletedAt" IS NULL AND upper(trim("testName")) IN ('IELTS','PTE','TOEFL')`),
    ])) as [
      Array<{ id: string; k: string }>,
      Array<{ id: string; k: string }>,
      Array<{ id: string; k: string }>,
      Array<{ id: string; k: string; maxScore: string | number | null }>,
    ];

    const uniIds = uniRows.map((u) => u.id);
    const courseRows = (await em.query(
      `SELECT id, "uniId", lower(trim("courseName")) AS n, "sysDegreeId", "isPublished" FROM "UniCourses" WHERE "deletedAt" IS NULL AND "uniId" = ANY($1::uuid[])`,
      [uniIds],
    )) as Array<{ id: string; uniId: string; n: string; sysDegreeId: string; isPublished: boolean }>;
    const intakeRows = (await em.query(
      `SELECT ci.id, ci."uniCourseId", ci."intakeYear", ci."intakeMonth", ci."isPublished" FROM "UniCourseIntakes" ci WHERE ci."deletedAt" IS NULL AND ci."uniCourseId" = ANY($1::uuid[])`,
      [courseRows.map((c) => c.id)],
    )) as Array<{ id: string; uniCourseId: string; intakeYear: number; intakeMonth: number; isPublished: boolean }>;

    return {
      universities: new Map(uniRows.map((r) => [r.k, r.id])),
      programmes: new Map(progRows.map((r) => [r.k, r.id])),
      degrees: new Map(degreeRows.map((r) => [r.k, r.id])),
      englishTests: new Map(
        testRows.map((r) => [
          r.k as EnglishTestName,
          { id: r.id, maxScore: r.maxScore == null ? null : Number(r.maxScore) },
        ]),
      ),
      existingCourses: new Map(
        courseRows.map((c) => [`${c.uniId}|${c.n}|${c.sysDegreeId}`, { id: c.id, isPublished: c.isPublished }]),
      ),
      existingIntakes: new Map(
        intakeRows.map((i) => [`${i.uniCourseId}|${i.intakeYear}|${i.intakeMonth}`, { id: i.id, isPublished: i.isPublished }]),
      ),
    };
  }

  resolve(rows: ValidRow[], ctx: CourseCtx): Map<number, RowIssue[]> {
    const errors = new Map<number, RowIssue[]>();
    for (const r of rows) {
      const list: RowIssue[] = [];
      const v = r.values;
      const uniName = v.uniName as string;
      if (!ctx.universities.has(normName(uniName))) {
        list.push({
          severity: 'ERROR',
          code: ImportErrorCode.UNIVERSITY_NOT_FOUND,
          column: 'uniName',
          message: `University "${uniName}" not found. Upload it in university.csv first.`,
        });
      }
      for (const header of ['degreeName', 'minDegreeName', 'higherDegreeName']) {
        const name = strOrNull(v[header]);
        if (name && !ctx.degrees.has(normName(name))) {
          list.push({ severity: 'ERROR', code: ImportErrorCode.UNKNOWN_DEGREE, column: header, message: `Unknown degree "${name}"` });
        }
      }
      for (const t of ENGLISH_TESTS) {
        const overall = strOrNull(v[testHeader(t, 'Overall')]);
        const section = strOrNull(v[testHeader(t, 'Section')]);
        if (overall == null && section == null) continue;
        const test = ctx.englishTests.get(t);
        if (!test) {
          list.push({ severity: 'ERROR', code: ImportErrorCode.UNKNOWN_ENGLISH_TEST, column: testHeader(t, 'Overall'), message: `English test ${t} does not exist in the system` });
          continue;
        }
        for (const [part, val] of [['Overall', overall], ['Section', section]] as const) {
          if (val != null && test.maxScore != null && Number(val) > test.maxScore) {
            list.push({ severity: 'ERROR', code: ImportErrorCode.INVALID_FORMAT, column: testHeader(t, part), message: `${testHeader(t, part)} must be ≤ ${test.maxScore}` });
          }
        }
      }
      if (list.length) errors.set(r.rowNumber, list);
    }
    return errors;
  }

  async createParents(rows: ValidRow[], ctx: CourseCtx, em: EntityManager, batchId: string): Promise<void> {
    const missing = new Map<string, string>(); // norm -> original spelling
    for (const r of rows) {
      const name = r.values.programmeName as string;
      if (!ctx.programmes.has(normName(name)) && !missing.has(normName(name))) missing.set(normName(name), cleanName(name));
    }
    if (missing.size === 0) return;
    await em.query(
      `INSERT INTO "sys_Programmes" ("name", "isPublished", "importBatchId")
       SELECT n, false, $2 FROM unnest($1::text[]) AS t(n)
       ON CONFLICT (lower(trim("name"))) WHERE "deletedAt" IS NULL DO NOTHING`,
      [[...missing.values()], batchId],
    );
    const found = (await em.query(
      `SELECT id, lower(trim("name")) AS k FROM "sys_Programmes" WHERE "deletedAt" IS NULL AND lower(trim("name")) = ANY($1::text[])`,
      [[...missing.keys()]],
    )) as Array<{ id: string; k: string }>;
    for (const f of found) ctx.programmes.set(f.k, f.id);
  }

  writeChunk(rows: ValidRow[], ctx: CourseCtx, em: EntityManager, batchId: string): Promise<ChunkOutcome> {
    return this.writer.writeChunk(rows, ctx, em, batchId);
  }
}

export { resolveCourseIds, ENGLISH_TESTS, testHeader } from './courseContext';
export type { CourseCtx, EnglishTestName, ResolvedCourseIds } from './courseContext';
