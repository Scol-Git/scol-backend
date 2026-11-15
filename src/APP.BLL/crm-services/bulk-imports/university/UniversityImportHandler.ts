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
import { UNIVERSITY_SCHEMA } from './university.schema';
import { UniversityDraftWriter } from './UniversityDraftWriter';

export interface UniversityCtx {
  /** normName(countryName) -> id */
  countries: Map<string, string>;
  /** `${countryId}|${normName(stateName)}` -> id */
  states: Map<string, string>;
  /** `${stateId}|${normName(cityName)}` -> id */
  cities: Map<string, string>;
  /** normName(uniName) -> existing university */
  existingUnis: Map<string, { id: string; isPublished: boolean }>;
  /** Filled after Phase 2, by rowNumber. */
  ids: Map<number, { countryId: string; stateId: string | null; cityId: string | null }>;
}

const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const distinct = <T>(items: T[]): T[] => [...new Set(items)];

@Injectable()
export class UniversityImportHandler implements BulkImportHandler<UniversityCtx> {
  readonly type = BulkImportType.UNIVERSITY;
  readonly schema = UNIVERSITY_SCHEMA;

  constructor(private readonly writer: UniversityDraftWriter) {}

  validate(row: SourceRow, _now: Date): RowValidation {
    const { values, issues } = validateCells(UNIVERSITY_SCHEMA, row.raw);
    const error = (column: string, message: string) =>
      issues.push({ severity: 'ERROR', code: ImportErrorCode.INVALID_FORMAT, column, message });

    if (values.cityName != null && values.stateName == null) {
      error('cityName', 'cityName requires stateName');
    }
    if ((values.commission != null) !== (values.commissionType != null)) {
      error('commission', 'commission and commissionType must be given together');
    }
    if (values.commissionType === 'PERCENTAGE' && values.commission != null && Number(values.commission) > 100) {
      error('commission', 'percentage commission must be 0–100');
    }

    if (hasError(issues)) return { issues };
    return {
      valid: { rowNumber: row.rowNumber, raw: row.raw, values, issues: [...issues] },
      issues,
    };
  }

  naturalKey(row: ValidRow): string {
    return normName(row.values.uniName as string);
  }

  async prefetch(rows: ValidRow[], em: EntityManager): Promise<UniversityCtx> {
    const countries = distinct(rows.map((r) => normName(r.values.countryName as string)));
    const states = distinct(rows.filter((r) => r.values.stateName != null).map((r) => normName(r.values.stateName as string)));
    const cities = distinct(rows.filter((r) => r.values.cityName != null).map((r) => normName(r.values.cityName as string)));
    const unis = distinct(rows.map((r) => this.naturalKey(r)));

    const [countryRows, stateRows, cityRows, uniRows] = (await Promise.all([
      em.query(
        `SELECT id, lower(trim("countryName")) AS k FROM "sys_Countries" WHERE "deletedAt" IS NULL AND lower(trim("countryName")) = ANY($1::text[])`,
        [countries],
      ),
      em.query(
        `SELECT id, "sysCountryId", lower(trim("stateName")) AS k FROM "sys_States" WHERE "deletedAt" IS NULL AND lower(trim("stateName")) = ANY($1::text[])`,
        [states],
      ),
      em.query(
        `SELECT id, "sysStateId", lower(trim("cityName")) AS k FROM "sys_Cities" WHERE "deletedAt" IS NULL AND lower(trim("cityName")) = ANY($1::text[])`,
        [cities],
      ),
      em.query(
        `SELECT id, "isPublished", lower(trim("uniName")) AS k FROM "sys_Universities" WHERE "deletedAt" IS NULL AND lower(trim("uniName")) = ANY($1::text[])`,
        [unis],
      ),
    ])) as [
      Array<{ id: string; k: string }>,
      Array<{ id: string; sysCountryId: string; k: string }>,
      Array<{ id: string; sysStateId: string; k: string }>,
      Array<{ id: string; isPublished: boolean; k: string }>,
    ];

    return {
      countries: new Map(countryRows.map((r) => [r.k, r.id])),
      states: new Map(stateRows.map((r) => [`${r.sysCountryId}|${r.k}`, r.id])),
      cities: new Map(cityRows.map((r) => [`${r.sysStateId}|${r.k}`, r.id])),
      existingUnis: new Map(uniRows.map((r) => [r.k, { id: r.id, isPublished: r.isPublished }])),
      ids: new Map(),
    };
  }

  /** Nothing is strict in the university CSV. */
  resolve(_rows: ValidRow[], _ctx: UniversityCtx): Map<number, RowIssue[]> {
    return new Map();
  }

  async createParents(rows: ValidRow[], ctx: UniversityCtx, em: EntityManager, batchId: string): Promise<void> {
    // 1. countries
    const newCountries = new Map<string, string>(); // norm -> original spelling
    for (const r of rows) {
      const name = r.values.countryName as string;
      if (!ctx.countries.has(normName(name)) && !newCountries.has(normName(name))) newCountries.set(normName(name), cleanName(name));
    }
    if (newCountries.size > 0) {
      await em.query(
        `INSERT INTO "sys_Countries" ("countryName", "isPublished", "importBatchId")
         SELECT n, false, $2 FROM unnest($1::text[]) AS t(n)
         ON CONFLICT (lower(trim("countryName"))) WHERE "deletedAt" IS NULL DO NOTHING`,
        [[...newCountries.values()], batchId],
      );
      const found = (await em.query(
        `SELECT id, lower(trim("countryName")) AS k FROM "sys_Countries" WHERE "deletedAt" IS NULL AND lower(trim("countryName")) = ANY($1::text[])`,
        [[...newCountries.keys()]],
      )) as Array<{ id: string; k: string }>;
      for (const f of found) ctx.countries.set(f.k, f.id);
    }

    // 2. states
    const newStates = new Map<string, { sysCountryId: string; stateName: string }>();
    for (const r of rows) {
      if (r.values.stateName == null) continue;
      const countryId = ctx.countries.get(normName(r.values.countryName as string));
      if (!countryId) continue;
      const key = `${countryId}|${normName(r.values.stateName as string)}`;
      if (!ctx.states.has(key) && !newStates.has(key)) {
        newStates.set(key, { sysCountryId: countryId, stateName: cleanName(r.values.stateName as string) });
      }
    }
    if (newStates.size > 0) {
      await em.query(
        `INSERT INTO "sys_States" ("sysCountryId", "stateName", "isPublished", "importBatchId")
         SELECT r."sysCountryId", r."stateName", false, $2 FROM jsonb_to_recordset($1::jsonb) AS r("sysCountryId" uuid, "stateName" text)
         ON CONFLICT ("sysCountryId", lower(trim("stateName"))) WHERE "deletedAt" IS NULL DO NOTHING`,
        [JSON.stringify([...newStates.values()]), batchId],
      );
      const found = (await em.query(
        `SELECT id, "sysCountryId", lower(trim("stateName")) AS k FROM "sys_States" WHERE "deletedAt" IS NULL AND "sysCountryId" = ANY($1::uuid[]) AND lower(trim("stateName")) = ANY($2::text[])`,
        [distinct([...newStates.values()].map((s) => s.sysCountryId)), distinct([...newStates.keys()].map((k) => k.slice(k.indexOf('|') + 1)))],
      )) as Array<{ id: string; sysCountryId: string; k: string }>;
      for (const f of found) ctx.states.set(`${f.sysCountryId}|${f.k}`, f.id);
    }

    // 3. cities
    const newCities = new Map<string, { sysStateId: string; cityName: string }>();
    for (const r of rows) {
      if (r.values.cityName == null) continue;
      const stateId = this.stateIdOf(r, ctx);
      if (!stateId) continue;
      const key = `${stateId}|${normName(r.values.cityName as string)}`;
      if (!ctx.cities.has(key) && !newCities.has(key)) {
        newCities.set(key, { sysStateId: stateId, cityName: cleanName(r.values.cityName as string) });
      }
    }
    if (newCities.size > 0) {
      await em.query(
        `INSERT INTO "sys_Cities" ("sysStateId", "cityName", "isPublished", "importBatchId")
         SELECT r."sysStateId", r."cityName", false, $2 FROM jsonb_to_recordset($1::jsonb) AS r("sysStateId" uuid, "cityName" text)
         ON CONFLICT ("sysStateId", lower(trim("cityName"))) WHERE "deletedAt" IS NULL DO NOTHING`,
        [JSON.stringify([...newCities.values()]), batchId],
      );
      const found = (await em.query(
        `SELECT id, "sysStateId", lower(trim("cityName")) AS k FROM "sys_Cities" WHERE "deletedAt" IS NULL AND "sysStateId" = ANY($1::uuid[]) AND lower(trim("cityName")) = ANY($2::text[])`,
        [distinct([...newCities.values()].map((c) => c.sysStateId)), distinct([...newCities.keys()].map((k) => k.slice(k.indexOf('|') + 1)))],
      )) as Array<{ id: string; sysStateId: string; k: string }>;
      for (const f of found) ctx.cities.set(`${f.sysStateId}|${f.k}`, f.id);
    }

    // fill ids per row
    for (const r of rows) {
      const countryId = ctx.countries.get(normName(r.values.countryName as string));
      if (!countryId) continue;
      const stateId = this.stateIdOf(r, ctx);
      const cityName = str(r.values.cityName);
      const cityId = stateId && cityName ? (ctx.cities.get(`${stateId}|${normName(cityName)}`) ?? null) : null;
      ctx.ids.set(r.rowNumber, { countryId, stateId, cityId });
    }
  }

  writeChunk(rows: ValidRow[], ctx: UniversityCtx, em: EntityManager, batchId: string): Promise<ChunkOutcome> {
    return this.writer.writeChunk(rows, ctx, em, batchId);
  }

  private stateIdOf(r: ValidRow, ctx: UniversityCtx): string | null {
    const stateName = str(r.values.stateName);
    if (!stateName) return null;
    const countryId = ctx.countries.get(normName(r.values.countryName as string));
    if (!countryId) return null;
    return ctx.states.get(`${countryId}|${normName(stateName)}`) ?? null;
  }
}
