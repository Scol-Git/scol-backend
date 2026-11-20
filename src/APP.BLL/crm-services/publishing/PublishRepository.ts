import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import type { PublishCountsDto } from '@shared/dtos/crm/bulk-imports/PublishPreviewResponseDto';

export interface PublishChain {
  intakeIds: string[];
  courseIds: string[];
  universityIds: string[];
  programmeIds: string[];
  countryIds: string[];
  stateIds: string[];
  cityIds: string[];
}

export const chainCounts = (c: PublishChain): PublishCountsDto => ({
  intakes: c.intakeIds.length,
  courses: c.courseIds.length,
  universities: c.universityIds.length,
  programmes: c.programmeIds.length,
  countries: c.countryIds.length,
  states: c.stateIds.length,
  cities: c.cityIds.length,
});

/** Geo ids hanging off a CTE named `u` (sys_Universities rows). */
const GEO_SELECT = `
  (SELECT coalesce(array_agg(DISTINCT x.id), '{}') FROM "sys_Countries" x JOIN u ON u."sysCountryId" = x.id WHERE NOT x."isPublished") AS "countryIds",
  (SELECT coalesce(array_agg(DISTINCT x.id), '{}') FROM "sys_States"    x JOIN u ON u."sysStateId"   = x.id WHERE NOT x."isPublished") AS "stateIds",
  (SELECT coalesce(array_agg(DISTINCT x.id), '{}') FROM "sys_Cities"    x JOIN u ON u."sysCityId"    = x.id WHERE NOT x."isPublished") AS "cityIds"`;

const UNI_COLS = `id, "isPublished", "sysCountryId", "sysStateId", "sysCityId"`;

/** Raw SQL for collecting and publishing a draft chain (set-based, no per-row loops). */
@Injectable()
export class PublishRepository {
  /** COURSE batch: draft intakes owned by the batch + the draft parents they depend on. */
  async collectCourseBatchChain(em: EntityManager, batchId: string): Promise<PublishChain> {
    const rows = (await em.query(
      `WITH i AS (
         SELECT ci.id, ci."uniCourseId" FROM "UniCourseIntakes" ci
         WHERE ci."importBatchId" = $1 AND ci."isPublished" = false AND ci."deletedAt" IS NULL
       ),
       c AS (SELECT DISTINCT c.id, c."isPublished", c."uniId", c."sysProgrammeId" FROM "UniCourses" c JOIN i ON i."uniCourseId" = c.id),
       u AS (SELECT DISTINCT u.id, u."isPublished", u."sysCountryId", u."sysStateId", u."sysCityId" FROM "sys_Universities" u JOIN c ON c."uniId" = u.id)
       SELECT
         (SELECT coalesce(array_agg(id), '{}') FROM i) AS "intakeIds",
         (SELECT coalesce(array_agg(id), '{}') FROM c WHERE NOT "isPublished") AS "courseIds",
         (SELECT coalesce(array_agg(id), '{}') FROM u WHERE NOT "isPublished") AS "universityIds",
         (SELECT coalesce(array_agg(DISTINCT p.id), '{}') FROM "sys_Programmes" p JOIN c ON c."sysProgrammeId" = p.id WHERE NOT p."isPublished") AS "programmeIds",
         ${GEO_SELECT}`,
      [batchId],
    )) as PublishChain[];
    return rows[0];
  }

  /** UNIVERSITY batch: draft universities owned by the batch + their draft geo parents. */
  collectUniversityBatchChain(em: EntityManager, batchId: string): Promise<PublishChain> {
    return this.collectUniversities(em, `"importBatchId" = $1 AND "isPublished" = false AND "deletedAt" IS NULL`, batchId);
  }

  /** A single draft university + its draft geo parents. */
  collectSingleUniversityChain(em: EntityManager, uniId: string): Promise<PublishChain> {
    return this.collectUniversities(em, `id = $1 AND "isPublished" = false AND "deletedAt" IS NULL`, uniId);
  }

  private async collectUniversities(em: EntityManager, where: string, param: string): Promise<PublishChain> {
    const rows = (await em.query(
      `WITH u AS (SELECT ${UNI_COLS} FROM "sys_Universities" WHERE ${where})
       SELECT
         '{}'::uuid[] AS "intakeIds",
         '{}'::uuid[] AS "courseIds",
         (SELECT coalesce(array_agg(id), '{}') FROM u) AS "universityIds",
         '{}'::uuid[] AS "programmeIds",
         ${GEO_SELECT}`,
      [param],
    )) as PublishChain[];
    return rows[0];
  }

  /** One UPDATE per table, top-down. Skips empty arrays. */
  async publishChain(em: EntityManager, chain: PublishChain, userId: string): Promise<void> {
    const steps: Array<[string, string[]]> = [
      ['sys_Countries', chain.countryIds],
      ['sys_States', chain.stateIds],
      ['sys_Cities', chain.cityIds],
      ['sys_Universities', chain.universityIds],
      ['sys_Programmes', chain.programmeIds],
      ['UniCourses', chain.courseIds],
      ['UniCourseIntakes', chain.intakeIds],
    ];
    for (const [table, ids] of steps) {
      if (ids.length === 0) continue;
      // `table` is a fixed literal from the list above, never user input.
      await em.query(
        `UPDATE "${table}" SET "isPublished" = true, "publishedAt" = now(), "publishedBy" = $2, "updatedAt" = now()
         WHERE id = ANY($1::uuid[]) AND "isPublished" = false`,
        [ids, userId],
      );
    }
  }

  // ---------------------------------------------------------------- discard

  /** Deletes never-published course drafts currently owned by the batch. Separate statements. */
  async discardCourseBatch(em: EntityManager, batchId: string): Promise<void> {
    await em.query(
      `CREATE TEMP TABLE _i ON COMMIT DROP AS
         SELECT id, "uniCourseId" FROM "UniCourseIntakes"
         WHERE "importBatchId" = $1 AND "isPublished" = false AND "publishedAt" IS NULL AND "deletedAt" IS NULL`,
      [batchId],
    );
    await em.query(`DELETE FROM "CourseIntakeScholarships" WHERE "courseIntakeId" IN (SELECT id FROM _i)`);
    await em.query(`DELETE FROM "UniCourseIntakes" WHERE id IN (SELECT id FROM _i)`);
    await em.query(
      `CREATE TEMP TABLE _c ON COMMIT DROP AS
         SELECT c.id FROM "UniCourses" c
         WHERE c."importBatchId" = $1 AND c."isPublished" = false AND c."publishedAt" IS NULL AND c."deletedAt" IS NULL
           AND NOT EXISTS (SELECT 1 FROM "UniCourseIntakes" ci WHERE ci."uniCourseId" = c.id)`,
      [batchId],
    );
    await em.query(`DELETE FROM "CourseEngReq" WHERE "uniCourseId" IN (SELECT id FROM _c)`);
    await em.query(`DELETE FROM "CourseRequiredDocuments" WHERE "uniCourseId" IN (SELECT id FROM _c)`);
    await em.query(`DELETE FROM "UniCourses" WHERE id IN (SELECT id FROM _c)`);
    await em.query(
      `DELETE FROM "sys_Programmes" p
       WHERE p."importBatchId" = $1 AND p."isPublished" = false AND p."publishedAt" IS NULL
         AND NOT EXISTS (SELECT 1 FROM "UniCourses" c WHERE c."sysProgrammeId" = p.id)
         AND NOT EXISTS (SELECT 1 FROM "LeadPreferredPrograms" l WHERE l."programme_id" = p.id)`,
      [batchId],
    );
  }

  /** Deletes never-published university drafts owned by the batch (and unused geo drafts). */
  async discardUniversityBatch(em: EntityManager, batchId: string): Promise<void> {
    await em.query(
      `CREATE TEMP TABLE _u ON COMMIT DROP AS
         SELECT u.id FROM "sys_Universities" u
         WHERE u."importBatchId" = $1 AND u."isPublished" = false AND u."publishedAt" IS NULL AND u."deletedAt" IS NULL
           AND NOT EXISTS (SELECT 1 FROM "UniCourses" c WHERE c."uniId" = u.id)`,
      [batchId],
    );
    await em.query(`DELETE FROM "UniApplicationStage" WHERE "uniId" IN (SELECT id FROM _u)`);
    await em.query(`DELETE FROM "UniAcademicReq" WHERE "uniId" IN (SELECT id FROM _u)`);
    await em.query(`DELETE FROM "UniEngReq" WHERE "uniId" IN (SELECT id FROM _u)`);
    await em.query(`DELETE FROM "sys_Universities" WHERE id IN (SELECT id FROM _u)`);
    await em.query(
      `DELETE FROM "sys_Cities" x
       WHERE x."importBatchId" = $1 AND x."isPublished" = false AND x."publishedAt" IS NULL
         AND NOT EXISTS (SELECT 1 FROM "sys_Universities" u WHERE u."sysCityId" = x.id)`,
      [batchId],
    );
    await em.query(
      `DELETE FROM "sys_States" x
       WHERE x."importBatchId" = $1 AND x."isPublished" = false AND x."publishedAt" IS NULL
         AND NOT EXISTS (SELECT 1 FROM "sys_Cities" c WHERE c."sysStateId" = x.id)
         AND NOT EXISTS (SELECT 1 FROM "sys_Universities" u WHERE u."sysStateId" = x.id)`,
      [batchId],
    );
    await em.query(
      `DELETE FROM "sys_Countries" x
       WHERE x."importBatchId" = $1 AND x."isPublished" = false AND x."publishedAt" IS NULL
         AND NOT EXISTS (SELECT 1 FROM "sys_States" s WHERE s."sysCountryId" = x.id)
         AND NOT EXISTS (SELECT 1 FROM "sys_Universities" u WHERE u."sysCountryId" = x.id)
         AND NOT EXISTS (SELECT 1 FROM "LeadPreferredCountries" l WHERE l."country_id" = x.id)
         AND NOT EXISTS (SELECT 1 FROM "LeadCrmInfos" l WHERE l."targetSysCountryId" = x.id)
         AND NOT EXISTS (SELECT 1 FROM "sys_StageRequiredDocuments" d WHERE d."sysCountryId" = x.id)`,
      [batchId],
    );
  }
}
