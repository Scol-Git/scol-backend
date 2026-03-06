import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { CommissionType } from '@shared/enums/CommissionType.enum';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import type { UniversityCsvRow } from '../dto/UniversityCsvRow';
import type { ResolvedUniversityRow } from '../dto/UniversityCsvRow';
import type { LocationMaps } from './LocationMaps';
import { stateKey, cityKey, universityKey } from './ImportKeys';

const LOG_CONTEXT = '[BulkImport:University:UniversityResolver]';

@Injectable()
export class UniversityResolverService {
  constructor(@Inject(ILoggerToken) private readonly logger: ILogger) {}

  async upsertUniversities(
    manager: EntityManager,
    rows: UniversityCsvRow[],
    locationMaps: LocationMaps,
  ): Promise<Map<string, string>> {
    const resolved = this.getUniqueResolvedRows(rows, locationMaps);
    this.logger.info(
      `${LOG_CONTEXT} Upserting ${resolved.length} unique universities`,
    );
    return this.upsertUniversitiesInternal(manager, resolved);
  }

  private getUniqueResolvedRows(
    rows: UniversityCsvRow[],
    { countryMap, stateMap, cityMap }: LocationMaps,
  ): ResolvedUniversityRow[] {
    const seen = new Set<string>();
    const result: ResolvedUniversityRow[] = [];
    for (const row of rows) {
      const countryName = row.countryName.trim();
      const stateName = row.stateName.trim();
      const cityName = row.cityName.trim();
      const uniName = row.uniName.trim();
      if (!countryName || !stateName || !cityName || !uniName) continue;

      const sysCountryId = countryMap.get(countryName.toLowerCase());
      if (!sysCountryId) continue;
      const sysStateId = stateMap.get(stateKey(sysCountryId, stateName));
      if (!sysStateId) continue;
      const sysCityId = cityMap.get(cityKey(sysStateId, cityName));
      if (!sysCityId) continue;

      const key = universityKey(uniName, sysCountryId, sysCityId);
      if (seen.has(key)) continue;
      seen.add(key);
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
      });
    }
    return result;
  }

  private async upsertUniversitiesInternal(
    manager: EntityManager,
    resolved: ResolvedUniversityRow[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysUniversities);
    const map = new Map<string, string>();
    let inserted = 0;
    let updated = 0;
    for (const row of resolved) {
      const key = universityKey(row.uniName, row.sysCountryId, row.sysCityId);
      const existing = await repo.findOne({
        where: {
          uniName: row.uniName,
          sysCountryId: row.sysCountryId,
          sysCityId: row.sysCityId,
        },
      });
      const campusLifeLinksArr = row.campusLifeLinks
        ? row.campusLifeLinks
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const commissionType =
        row.commissionType === 'AMOUNT'
          ? CommissionType.AMOUNT
          : row.commissionType === 'PERCENTAGE'
            ? CommissionType.PERCENTAGE
            : undefined;
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
      };
      if (existing) {
        Object.assign(existing, payload);
        const saved = await repo.save(existing);
        updated++;
        map.set(key, saved.id);
      } else {
        const entity = repo.create({
          uniName: row.uniName,
          sysCountryId: row.sysCountryId,
          sysStateId: row.sysStateId,
          sysCityId: row.sysCityId,
          ...payload,
        });
        const saved = await repo.save(entity);
        inserted++;
        map.set(key, saved.id);
      }
    }
    this.logger.info(
      `${LOG_CONTEXT} Universities: ${resolved.length} total (inserted: ${inserted}, updated: ${updated})`,
    );
    return map;
  }
}
