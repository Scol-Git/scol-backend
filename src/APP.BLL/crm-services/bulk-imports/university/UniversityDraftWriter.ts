import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { ImportErrorCode } from '../common/ImportErrorCode';
import {
  addRowIssue,
  emptyOutcome,
  type ChunkOutcome,
  type ValidRow,
} from '../common/BulkImportHandler';
import { cleanName, normName } from '../common/normName';
import type { UniversityCtx } from './UniversityImportHandler';

/** The only place that writes universities (raw, set-based SQL). */
@Injectable()
export class UniversityDraftWriter {
  async writeChunk(
    rows: ValidRow[],
    ctx: UniversityCtx,
    em: EntityManager,
    batchId: string,
  ): Promise<ChunkOutcome> {
    const outcome = emptyOutcome();
    const toSend: ValidRow[] = [];
    const payload: Array<Record<string, unknown>> = [];

    for (const row of rows) {
      const key = normName(row.values.uniName as string);
      const existing = ctx.existingUnis.get(key);
      if (existing?.isPublished) {
        outcome.skipped++;
        addRowIssue(outcome, row.rowNumber, {
          severity: 'WARNING',
          code: ImportErrorCode.PUBLISHED_DIFFERS,
          message:
            'University already published; CSV values were not applied. Edit it in the CRM.',
        });
        continue;
      }
      const ids = ctx.ids.get(row.rowNumber);
      if (!ids) {
        outcome.failedRows.add(row.rowNumber);
        addRowIssue(outcome, row.rowNumber, {
          severity: 'ERROR',
          code: ImportErrorCode.UNEXPECTED_ERROR,
          message: 'Could not resolve country/state/city.',
        });
        continue;
      }
      const v = row.values;
      toSend.push(row);
      payload.push({
        uniName: cleanName(v.uniName as string),
        sysCountryId: ids.countryId,
        sysStateId: ids.stateId,
        sysCityId: ids.cityId,
        address: v.address ?? null,
        commissionType: v.commissionType ?? null,
        commission: v.commission ?? null,
        logoUrl: v.logoUrl ?? null,
        website: v.website ?? null,
        aboutUs: v.aboutUs ?? null,
        coverImageUrl: v.coverImageUrl ?? null,
        // TypeORM simple-array is stored as one comma-joined text value.
        campusLifeLinks: (v.campusLifeLinks as string[] | null)?.join(',') ?? null,
        rankingMetaData: v.rankingMetaData ?? null,
        locationMapMetaData: v.locationMapMetaData ?? null,
        establishedYear: v.establishedYear ?? null,
        universityType: v.universityType ?? null,
        currRanking: v.currRanking ?? null,
      });
    }

    if (payload.length === 0) return outcome;

    const returned = (await em.query(
      `INSERT INTO "sys_Universities" (
         "uniName","sysCountryId","sysStateId","sysCityId","address","commissionType","commission",
         "logoUrl","website","aboutUs","coverImageUrl","campusLifeLinks","rankingMetaData",
         "locationMapMetaData","establishedYear","universityType","currRanking","isPublished","importBatchId")
       SELECT r."uniName", r."sysCountryId", r."sysStateId", r."sysCityId", r."address", r."commissionType", r."commission",
              r."logoUrl", r."website", r."aboutUs", r."coverImageUrl", r."campusLifeLinks", r."rankingMetaData",
              r."locationMapMetaData", r."establishedYear", r."universityType", r."currRanking", false, $2
       FROM jsonb_to_recordset($1::jsonb) AS r(
         "uniName" text, "sysCountryId" uuid, "sysStateId" uuid, "sysCityId" uuid, "address" text, "commissionType" text,
         "commission" numeric, "logoUrl" text, "website" text, "aboutUs" text, "coverImageUrl" text, "campusLifeLinks" text,
         "rankingMetaData" jsonb, "locationMapMetaData" text, "establishedYear" int, "universityType" text, "currRanking" int)
       ON CONFLICT (lower(trim("uniName"))) WHERE "deletedAt" IS NULL
       DO UPDATE SET
         "sysCountryId" = EXCLUDED."sysCountryId", "sysStateId" = EXCLUDED."sysStateId", "sysCityId" = EXCLUDED."sysCityId",
         "address" = EXCLUDED."address", "commissionType" = EXCLUDED."commissionType", "commission" = EXCLUDED."commission",
         "logoUrl" = EXCLUDED."logoUrl", "website" = EXCLUDED."website", "aboutUs" = EXCLUDED."aboutUs",
         "coverImageUrl" = EXCLUDED."coverImageUrl", "campusLifeLinks" = EXCLUDED."campusLifeLinks",
         "rankingMetaData" = EXCLUDED."rankingMetaData", "locationMapMetaData" = EXCLUDED."locationMapMetaData",
         "establishedYear" = EXCLUDED."establishedYear", "universityType" = EXCLUDED."universityType",
         "currRanking" = EXCLUDED."currRanking", "importBatchId" = EXCLUDED."importBatchId", "updatedAt" = now()
         WHERE "sys_Universities"."isPublished" = false
       RETURNING id, lower(trim("uniName")) AS k, (xmax = 0) AS inserted`,
      [JSON.stringify(payload), batchId],
    )) as Array<{ id: string; k: string; inserted: boolean }>;

    const byKey = new Map(returned.map((r) => [r.k, r]));
    const insertedIds: string[] = [];
    for (const row of toSend) {
      const r = byKey.get(normName(row.values.uniName as string));
      if (!r) {
        // Became published between prefetch and write: not applied.
        outcome.skipped++;
        addRowIssue(outcome, row.rowNumber, {
          severity: 'WARNING',
          code: ImportErrorCode.PUBLISHED_DIFFERS,
          message:
            'University already published; CSV values were not applied. Edit it in the CRM.',
        });
      } else if (r.inserted) {
        outcome.created++;
        insertedIds.push(r.id);
      } else {
        outcome.updated++;
      }
    }

    if (insertedIds.length > 0) {
      // Default stage flow for new universities (mirrors UniStageFlowSeeder.ensureSeeded).
      await em.query(
        `INSERT INTO "UniApplicationStage" ("uniId","sysApplicationStageId","displayOrder","isEnabled")
         SELECT u.id, s.id,
                ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY s."stageOrder" NULLS LAST, s."stageCode"),
                true
         FROM unnest($1::uuid[]) AS u(id)
         CROSS JOIN "sys_ApplicationStage" s
         WHERE s."deletedAt" IS NULL
         ON CONFLICT DO NOTHING`,
        [insertedIds],
      );
    }

    return outcome;
  }
}
