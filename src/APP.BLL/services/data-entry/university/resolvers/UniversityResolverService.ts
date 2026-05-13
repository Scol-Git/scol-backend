import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { CommissionType } from '@shared/enums/CommissionType.enum';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import type {
  ValidatedUniversityCsvRow,
  ResolvedUniversityRow,
} from '../dto/UniversityCsvRow';
import type { LocationMaps } from './LocationMaps';
import { universityKey } from './ImportKeys';
import { resolveUniversityRowLocations } from './universityLocationResolution';
const LOG_CONTEXT = '[BulkImport:University:UniversityResolver]';

/**
 * Multiple URLs in one CSV cell: split on comma and/or semicolon.
 * **CSV gotcha:** unquoted `url1, url2` is parsed as *two columns* — only the first URL
 * lands in `campusLifeLinks`. Use **quoted** comma-separated values, or **semicolon**-separated
 * URLs in an unquoted cell (e.g. `https://a; https://b`).
 */
function splitCampusLifeLinksCell(raw: string): string[] {
  if (!raw.trim()) {
    return [];
  }
  return raw
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

@Injectable()
export class UniversityResolverService {
  constructor(@Inject(ILoggerToken) private readonly logger: ILogger) {}

  async upsertUniversities(
    manager: EntityManager,
    rows: ValidatedUniversityCsvRow[],
    locationMaps: LocationMaps,
  ): Promise<Map<string, string>> {
    const resolved = this.buildDedupedResolvedRowsForUpsert(rows, locationMaps);
    this.logger.info(
      `${LOG_CONTEXT} Upserting ${resolved.length} unique universities`,
    );
    return this.bulkUpsertResolvedUniversityRows(manager, resolved);
  }

  /**
   * Rows that cannot resolve country/state/city are omitted here; user-facing reasons use the same
   * rules in {@link resolveUniversityRowLocations} via {@link UniversityRowResultBuilder}.
   */
  private buildDedupedResolvedRowsForUpsert(
    rows: ValidatedUniversityCsvRow[],
    locationMaps: LocationMaps,
  ): ResolvedUniversityRow[] {
    const seen = new Set<string>();
    const result: ResolvedUniversityRow[] = [];
    for (const row of rows) {
      const loc = resolveUniversityRowLocations(row, locationMaps);
      if (!loc.ok) continue;

      const { sysCountryId, sysStateId, sysCityId } = loc;
      const uniName = row.uniName.trim();

      const key = universityKey(uniName, sysCountryId, sysCityId);
      if (seen.has(key)) continue;
      seen.add(key);
      const rankingMetaData = row.rankingMetaDataItems;
      const locationMapMetaData = row.locationMapUrl;
      const establishedYearRaw = row.establishedYear?.trim();
      const establishedYear =
        establishedYearRaw !== undefined && establishedYearRaw !== ''
          ? parseInt(establishedYearRaw, 10)
          : undefined;
      const universityType = row.universityType?.trim() || undefined;
      const currRankingRaw = row.currRanking?.trim();
      const currRanking =
        currRankingRaw !== undefined && currRankingRaw !== ''
          ? parseInt(currRankingRaw, 10)
          : undefined;
      result.push({
        uniName,
        sysCountryId,
        sysStateId,
        sysCityId,
        commission: row.commission.trim(),
        commissionType: row.commissionType.trim(),
        logoUrl: row.logoUrl.trim(),
        website: row.website.trim(),
        aboutUs: row.aboutUs.trim(),
        address: row.address.trim(),
        coverImageUrl: row.coverImageUrl.trim(),
        campusLifeLinks: row.campusLifeLinks.trim(),
        rankingMetaData,
        locationMapMetaData,
        establishedYear: Number.isNaN(establishedYear) ? undefined : establishedYear,
        universityType,
        currRanking: Number.isNaN(currRanking) ? undefined : currRanking,
      });
    }
    return result;
  }

  /**
   * Loads existing rows in chunked SELECTs (OR of natural keys), then persists with a batched
   * batched `save`. Avoids O(N) round-trips from per-row `findOne` + `save`.
   * True DB `upsert()` would need a unique constraint on (uniName, sysCountryId, sysCityId).
   */
  private async bulkUpsertResolvedUniversityRows(
    manager: EntityManager,
    resolved: ResolvedUniversityRow[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysUniversities);
    const keyToExisting = new Map<string, SysUniversities>();
    const whereChunkSize = 400;

    for (let i = 0; i < resolved.length; i += whereChunkSize) {
      const chunk = resolved.slice(i, i + whereChunkSize);
      const found = await repo.find({
        where: chunk.map((row) => ({
          uniName: row.uniName,
          sysCountryId: row.sysCountryId,
          sysCityId: row.sysCityId,
        })),
      });
      for (const entity of found) {
        keyToExisting.set(
          universityKey(
            entity.uniName,
            entity.sysCountryId,
            entity.sysCityId ?? '',
          ),
          entity,
        );
      }
    }

    const map = new Map<string, string>();
    let inserted = 0;
    let updated = 0;
    const toPersist: SysUniversities[] = [];

    for (const row of resolved) {
      const key = universityKey(row.uniName, row.sysCountryId, row.sysCityId);
      const campusLifeLinksArr = splitCampusLifeLinksCell(row.campusLifeLinks);
      const commissionType =
        row.commissionType === 'AMOUNT'
          ? CommissionType.AMOUNT
          : row.commissionType === 'PERCENTAGE'
            ? CommissionType.PERCENTAGE
            : undefined;
      // locationMapMetaData: new writes are plain URLs; legacy DB values may be JSON.stringify(url).
      const payload = {
        commission: row.commission || undefined,
        commissionType,
        logoUrl: row.logoUrl || undefined,
        website: row.website || undefined,
        aboutUs: row.aboutUs || undefined,
        address: row.address || undefined,
        coverImageUrl: row.coverImageUrl || undefined,
        campusLifeLinks:
          campusLifeLinksArr.length > 0 ? campusLifeLinksArr : undefined,
        rankingMetaData: row.rankingMetaData,
        locationMapMetaData: row.locationMapMetaData,
        establishedYear: row.establishedYear,
        universityType: row.universityType,
        currRanking: row.currRanking,
      };

      const existing = keyToExisting.get(key);
      if (existing) {
        Object.assign(existing, payload);
        toPersist.push(existing);
        updated++;
      } else {
        toPersist.push(
          repo.create({
            uniName: row.uniName,
            sysCountryId: row.sysCountryId,
            sysStateId: row.sysStateId,
            sysCityId: row.sysCityId,
            ...payload,
          }),
        );
        inserted++;
      }
    }

    const saved =
      toPersist.length > 0 ? await repo.save(toPersist) : ([] as SysUniversities[]);
    for (let i = 0; i < resolved.length; i++) {
      const row = resolved[i];
      map.set(
        universityKey(row.uniName, row.sysCountryId, row.sysCityId),
        saved[i]!.id,
      );
    }

    this.logger.info(
      `${LOG_CONTEXT} Universities: ${resolved.length} total (inserted: ${inserted}, updated: ${updated})`,
    );
    return map;
  }
}
