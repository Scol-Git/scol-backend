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
   * Duplicate uniName in one file: last row wins (location and other fields updated).
   */
  private buildDedupedResolvedRowsForUpsert(
    rows: ValidatedUniversityCsvRow[],
    locationMaps: LocationMaps,
  ): ResolvedUniversityRow[] {
    const byName = new Map<string, ResolvedUniversityRow>();
    for (const row of rows) {
      const loc = resolveUniversityRowLocations(row, locationMaps);
      if (!loc.ok) continue;

      const { sysCountryId, sysStateId, sysCityId } = loc;
      const uniName = row.uniName.trim();

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
      byName.set(universityKey(uniName), {
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
    return [...byName.values()];
  }

  /**
   * Upsert by uniName only: existing row gets updated location IDs and other CSV fields.
   */
  private async bulkUpsertResolvedUniversityRows(
    manager: EntityManager,
    resolved: ResolvedUniversityRow[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysUniversities);
    const nameToExisting = new Map<string, SysUniversities>();

    const uniqueNames = [
      ...new Set(resolved.map((row) => universityKey(row.uniName))),
    ];
    if (uniqueNames.length > 0) {
      const found = await repo
        .createQueryBuilder('u')
        .where('LOWER(TRIM(u.uniName)) IN (:...names)', { names: uniqueNames })
        .getMany();
      for (const entity of found) {
        const key = universityKey(entity.uniName);
        if (!nameToExisting.has(key)) {
          nameToExisting.set(key, entity);
        }
      }
    }

    const map = new Map<string, string>();
    let inserted = 0;
    let updated = 0;
    const toPersist: SysUniversities[] = [];

    for (const row of resolved) {
      const key = universityKey(row.uniName);
      const campusLifeLinksArr = splitCampusLifeLinksCell(row.campusLifeLinks);
      const commissionType =
        row.commissionType === 'AMOUNT'
          ? CommissionType.AMOUNT
          : row.commissionType === 'PERCENTAGE'
            ? CommissionType.PERCENTAGE
            : undefined;
      const payload = {
        sysCountryId: row.sysCountryId,
        sysStateId: row.sysStateId,
        sysCityId: row.sysCityId,
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

      const existing = nameToExisting.get(key);
      if (existing) {
        Object.assign(existing, payload);
        toPersist.push(existing);
        updated++;
      } else {
        toPersist.push(
          repo.create({
            uniName: row.uniName,
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
      map.set(universityKey(row.uniName), saved[i]!.id);
    }

    this.logger.info(
      `${LOG_CONTEXT} Universities: ${resolved.length} total (inserted: ${inserted}, updated: ${updated})`,
    );
    return map;
  }
}
