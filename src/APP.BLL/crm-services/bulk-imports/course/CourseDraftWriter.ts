import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import {
  addRowIssue,
  emptyOutcome,
  type ChunkOutcome,
  type ValidRow,
} from '../common/BulkImportHandler';
import { ImportErrorCode } from '../common/ImportErrorCode';
import { cleanName, normName } from '../common/normName';
import type { ParsedIntake } from './intakeInfoParser';
import {
  ENGLISH_TESTS,
  resolveCourseIds,
  testHeader,
  type CourseCtx,
  type ResolvedCourseIds,
} from './courseContext';

const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface RowState {
  row: ValidRow;
  ids: ResolvedCourseIds;
  courseId: string;
  courseIsDraft: boolean;
  courseInserted: boolean;
  intakesTotal: number;
  intakesSkipped: number;
  intakesInserted: number;
}

/** The only place that writes courses, intakes, English requirements and scholarships (raw, set-based SQL). */
@Injectable()
export class CourseDraftWriter {
  async writeChunk(
    rows: ValidRow[],
    ctx: CourseCtx,
    em: EntityManager,
    batchId: string,
  ): Promise<ChunkOutcome> {
    const outcome = emptyOutcome();

    // ---- Step 1: courses -------------------------------------------------
    const states = new Map<number, RowState>();
    const coursePayload: Array<Record<string, unknown>> = [];
    const sentRows: Array<{ row: ValidRow; ids: ResolvedCourseIds }> = [];

    for (const row of rows) {
      const ids = resolveCourseIds(row, ctx);
      if (!ids || !ids.programmeId) {
        this.fail(outcome, row.rowNumber, 'Could not resolve university, programme or degree.');
        continue;
      }
      const v = row.values;
      const key = `${ids.uniId}|${normName(v.courseName as string)}|${ids.degreeId}`;
      const existing = ctx.existingCourses.get(key);
      const intakes = v.intakeInfo as ParsedIntake[];
      const state: RowState = {
        row,
        ids,
        courseId: existing?.id ?? '',
        courseIsDraft: !existing?.isPublished,
        courseInserted: false,
        intakesTotal: intakes.length,
        intakesSkipped: 0,
        intakesInserted: 0,
      };
      states.set(row.rowNumber, state);
      if (existing?.isPublished) {
        addRowIssue(outcome, row.rowNumber, {
          severity: 'WARNING',
          code: ImportErrorCode.PUBLISHED_DIFFERS,
          message:
            'Course already published; course-level values (degree requirements, English requirements, URL) were not applied.',
        });
        continue;
      }
      sentRows.push({ row, ids });
      coursePayload.push({
        uniId: ids.uniId,
        sysProgrammeId: ids.programmeId,
        sysDegreeId: ids.degreeId,
        courseName: cleanName(v.courseName as string),
        minSysDegreeId: ids.minDegreeId,
        minGpa: v.minGpa ?? null,
        higherSysDegreeId: ids.higherDegreeId,
        higherGpa: v.higherGpa ?? null,
        requirementMetaData: v.AcademicRequirementsMetaData ?? null,
        externalUrl: v.courseUrlExternal ?? null,
      });
    }

    if (coursePayload.length > 0) {
      const returned = (await em.query(
        `INSERT INTO "UniCourses" ("uniId","sysProgrammeId","sysDegreeId","courseName","minSysDegreeId","minGpa",
           "higherSysDegreeId","higherGpa","requirementMetaData","externalUrl","isPublished","importBatchId")
         SELECT r."uniId", r."sysProgrammeId", r."sysDegreeId", r."courseName", r."minSysDegreeId", r."minGpa",
                r."higherSysDegreeId", r."higherGpa", r."requirementMetaData", r."externalUrl", false, $2
         FROM jsonb_to_recordset($1::jsonb) AS r("uniId" uuid, "sysProgrammeId" uuid, "sysDegreeId" uuid, "courseName" text,
           "minSysDegreeId" uuid, "minGpa" numeric, "higherSysDegreeId" uuid, "higherGpa" numeric,
           "requirementMetaData" jsonb, "externalUrl" text)
         ON CONFLICT ("uniId", lower(trim("courseName")), "sysDegreeId") WHERE "deletedAt" IS NULL
         DO UPDATE SET "sysProgrammeId" = EXCLUDED."sysProgrammeId", "minSysDegreeId" = EXCLUDED."minSysDegreeId",
           "minGpa" = EXCLUDED."minGpa", "higherSysDegreeId" = EXCLUDED."higherSysDegreeId", "higherGpa" = EXCLUDED."higherGpa",
           "requirementMetaData" = EXCLUDED."requirementMetaData", "externalUrl" = EXCLUDED."externalUrl",
           "importBatchId" = EXCLUDED."importBatchId", "updatedAt" = now()
           WHERE "UniCourses"."isPublished" = false
         RETURNING id, "uniId", lower(trim("courseName")) AS n, "sysDegreeId", (xmax = 0) AS inserted`,
        [JSON.stringify(coursePayload), batchId],
      )) as Array<{ id: string; uniId: string; n: string; sysDegreeId: string; inserted: boolean }>;
      const byKey = new Map(returned.map((r) => [`${r.uniId}|${r.n}|${r.sysDegreeId}`, r]));
      for (const { row, ids } of sentRows) {
        const st = states.get(row.rowNumber) as RowState;
        const r = byKey.get(`${ids.uniId}|${normName(row.values.courseName as string)}|${ids.degreeId}`);
        if (!r) {
          // became published between prefetch and write
          states.delete(row.rowNumber);
          this.fail(outcome, row.rowNumber, 'Course was published while importing; not changed.');
          continue;
        }
        st.courseId = r.id;
        st.courseInserted = r.inserted;
      }
    }

    // ---- Step 2: English requirements (draft courses only) ---------------
    const draftStates = [...states.values()].filter((s) => s.courseIsDraft);
    if (draftStates.length > 0) {
      const engPayload: Array<Record<string, unknown>> = [];
      for (const s of draftStates) {
        for (const t of ENGLISH_TESTS) {
          const overall = s.row.values[testHeader(t, 'Overall')];
          const test = ctx.englishTests.get(t);
          if (overall == null || !test) continue;
          engPayload.push({
            uniCourseId: s.courseId,
            sysEngTestId: test.id,
            minOverallReq: overall,
            minSectionReq: s.row.values[testHeader(t, 'Section')] ?? null,
          });
        }
      }
      await em.query(`DELETE FROM "CourseEngReq" WHERE "uniCourseId" = ANY($1::uuid[])`, [draftStates.map((s) => s.courseId)]);
      if (engPayload.length > 0) {
        await em.query(
          `INSERT INTO "CourseEngReq" ("uniCourseId","sysEngTestId","minOverallReq","minSectionReq")
           SELECT r."uniCourseId", r."sysEngTestId", r."minOverallReq", r."minSectionReq"
           FROM jsonb_to_recordset($1::jsonb) AS r("uniCourseId" uuid, "sysEngTestId" uuid, "minOverallReq" numeric, "minSectionReq" numeric)`,
          [JSON.stringify(engPayload)],
        );
      }
    }

    // ---- Step 3: intakes --------------------------------------------------
    const intakePayload: Array<Record<string, unknown>> = [];
    const intakeOwner = new Map<string, RowState>(); // `${courseId}|${year}|${month}` -> row state
    for (const s of states.values()) {
      const v = s.row.values;
      for (const i of v.intakeInfo as ParsedIntake[]) {
        const key = `${s.courseId}|${i.year}|${i.month}`;
        const existing = ctx.existingIntakes.get(key);
        if (existing?.isPublished) {
          s.intakesSkipped++;
          addRowIssue(outcome, s.row.rowNumber, {
            severity: 'WARNING',
            code: ImportErrorCode.ALREADY_PUBLISHED,
            message: `Intake ${MON[i.month - 1]} ${i.year} is already published; not changed.`,
          });
          continue;
        }
        intakeOwner.set(key, s);
        intakePayload.push({
          uniCourseId: s.courseId,
          intakeMonth: i.month,
          intakeYear: i.year,
          courseDuration: v.courseDuration ?? null,
          applicationDeadline: v.applicationDeadline ?? null,
          tuitionFee: v.tuitionFee ?? null,
          currency: v.currency ?? null,
          initialDeposit: v.initialDeposit ?? null,
          feesMetaData: v.feesMetaData ?? null,
          scholarshipMetaData: v.scholarshipMetaData ?? null,
          applicationFee: v.applicationFee ?? null,
        });
      }
    }

    const returnedIntakes: Array<{ id: string; uniCourseId: string; intakeYear: number; intakeMonth: number; inserted: boolean }> =
      intakePayload.length === 0
        ? []
        : await em.query(
            `INSERT INTO "UniCourseIntakes" ("uniCourseId","intakeMonth","intakeYear","courseDuration","applicationDeadline",
               "tuitionFee","currency","initialDeposit","feesMetaData","scholarshipMetaData","applicationFee",
               "isActive","isPublished","importBatchId")
             SELECT r."uniCourseId", r."intakeMonth", r."intakeYear", r."courseDuration", r."applicationDeadline",
                    r."tuitionFee", r."currency", r."initialDeposit", r."feesMetaData", r."scholarshipMetaData", r."applicationFee",
                    true, false, $2
             FROM jsonb_to_recordset($1::jsonb) AS r("uniCourseId" uuid, "intakeMonth" int, "intakeYear" int, "courseDuration" int,
               "applicationDeadline" date, "tuitionFee" numeric, "currency" text, "initialDeposit" numeric,
               "feesMetaData" jsonb, "scholarshipMetaData" jsonb, "applicationFee" numeric)
             ON CONFLICT ("uniCourseId", "intakeYear", "intakeMonth") WHERE "deletedAt" IS NULL
             DO UPDATE SET "courseDuration" = EXCLUDED."courseDuration", "applicationDeadline" = EXCLUDED."applicationDeadline",
               "tuitionFee" = EXCLUDED."tuitionFee", "currency" = EXCLUDED."currency", "initialDeposit" = EXCLUDED."initialDeposit",
               "feesMetaData" = EXCLUDED."feesMetaData", "scholarshipMetaData" = EXCLUDED."scholarshipMetaData",
               "applicationFee" = EXCLUDED."applicationFee", "importBatchId" = EXCLUDED."importBatchId", "updatedAt" = now()
               WHERE "UniCourseIntakes"."isPublished" = false
             RETURNING id, "uniCourseId", "intakeYear", "intakeMonth", (xmax = 0) AS inserted`,
            [JSON.stringify(intakePayload), batchId],
          );

    const returnedKeys = new Set<string>();
    const scholarshipPayload: Array<Record<string, unknown>> = [];
    for (const r of returnedIntakes) {
      const key = `${r.uniCourseId}|${r.intakeYear}|${r.intakeMonth}`;
      returnedKeys.add(key);
      const s = intakeOwner.get(key);
      if (!s) continue;
      if (r.inserted) s.intakesInserted++;
      const v = s.row.values;
      if (v.scholarshipName != null) {
        scholarshipPayload.push({
          courseIntakeId: r.id,
          name: v.scholarshipName,
          amount: v.scholarshipAmount ?? null,
          amountType: v.scholarshipType ?? null,
        });
      }
    }
    // intakes that became published meanwhile were not returned: count as skipped
    for (const [key, s] of intakeOwner) {
      if (!returnedKeys.has(key)) s.intakesSkipped++;
    }

    // ---- Step 4: scholarships for the draft intakes -----------------------
    if (returnedIntakes.length > 0) {
      await em.query(`DELETE FROM "CourseIntakeScholarships" WHERE "courseIntakeId" = ANY($1::uuid[])`, [
        returnedIntakes.map((r) => r.id),
      ]);
      if (scholarshipPayload.length > 0) {
        await em.query(
          `INSERT INTO "CourseIntakeScholarships" ("courseIntakeId","name","amount","amountType","isActive")
           SELECT r."courseIntakeId", r."name", r."amount", r."amountType", true
           FROM jsonb_to_recordset($1::jsonb) AS r("courseIntakeId" uuid, "name" text, "amount" numeric, "amountType" text)`,
          [JSON.stringify(scholarshipPayload)],
        );
      }
    }

    // ---- Per-row outcome (counters count CSV rows) ------------------------
    for (const s of states.values()) {
      if (!s.courseIsDraft && s.intakesSkipped === s.intakesTotal) outcome.skipped++;
      else if (s.courseInserted || s.intakesInserted > 0) outcome.created++;
      else if (s.intakesSkipped === s.intakesTotal) outcome.skipped++;
      else outcome.updated++;
    }
    return outcome;
  }

  private fail(outcome: ChunkOutcome, rowNumber: number, message: string): void {
    outcome.failedRows.add(rowNumber);
    addRowIssue(outcome, rowNumber, {
      severity: 'ERROR',
      code: ImportErrorCode.UNEXPECTED_ERROR,
      message,
    });
  }
}
