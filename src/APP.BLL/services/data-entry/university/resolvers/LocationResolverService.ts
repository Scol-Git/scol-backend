import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysStates } from '@entity/entities/SysStates.entity';
import { SysCities } from '@entity/entities/SysCities.entity';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import type { ValidatedUniversityCsvRow } from '../dto/UniversityCsvRow';
import type { LocationMaps } from './LocationMaps';
import { stateKey, cityKey } from './ImportKeys';

const LOG_CONTEXT = '[BulkImport:University:LocationResolver]';

@Injectable()
export class LocationResolverService {
  constructor(@Inject(ILoggerToken) private readonly logger: ILogger) {}

  async resolveLocations(
    manager: EntityManager,
    rows: ValidatedUniversityCsvRow[],
  ): Promise<LocationMaps> {
    const uniqueCountryNames = [...new Set(rows.map((r) => r.countryName.trim()).filter(Boolean))];
    const countryMap = await this.resolveCountries(manager, uniqueCountryNames);
    const statePairs = this.getUniqueStatePairs(rows, countryMap);
    const stateMap = await this.resolveStates(manager, statePairs);
    const cityPairs = this.getUniqueCityPairs(rows, countryMap, stateMap);
    const cityMap = await this.resolveCities(manager, cityPairs);
    this.logger.info(
      `${LOG_CONTEXT} Resolved: ${uniqueCountryNames.length} countries, ${statePairs.length} states, ${cityPairs.length} cities`,
    );
    return { countryMap, stateMap, cityMap };
  }

  private async resolveCountries(manager: EntityManager, names: string[]): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysCountries);
    const map = new Map<string, string>();
    let inserted = 0;
    let existing = 0;
    for (const name of names) {
      const existingEntity = await repo.findOne({ where: { countryName: name } });
      if (existingEntity) {
        existing++;
        map.set(name.toLowerCase(), existingEntity.id);
      } else {
        const entity = repo.create({ countryName: name });
        const saved = await repo.save(entity);
        inserted++;
        map.set(name.toLowerCase(), saved.id);
      }
    }
    if (inserted > 0 || existing > 0) {
      this.logger.info(`${LOG_CONTEXT} Countries: ${names.length} total (inserted: ${inserted}, existing: ${existing})`);
    }
    return map;
  }

  private getUniqueStatePairs(
    rows: ValidatedUniversityCsvRow[],
    countryMap: Map<string, string>,
  ): { stateName: string; sysCountryId: string }[] {
    const seen = new Set<string>();
    const result: { stateName: string; sysCountryId: string }[] = [];
    for (const row of rows) {
      const countryName = row.countryName.trim();
      const stateName = row.stateName.trim();
      if (!countryName || !stateName) continue;
      const sysCountryId = countryMap.get(countryName.toLowerCase());
      if (!sysCountryId) continue;
      const key = stateKey(sysCountryId, stateName);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ stateName, sysCountryId });
    }
    return result;
  }

  private async resolveStates(
    manager: EntityManager,
    pairs: { stateName: string; sysCountryId: string }[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysStates);
    const map = new Map<string, string>();
    for (const { stateName, sysCountryId } of pairs) {
      const key = stateKey(sysCountryId, stateName);
      const existingEntity = await repo.findOne({ where: { stateName, sysCountryId } });
      if (existingEntity) {
        map.set(key, existingEntity.id);
      } else {
        const entity = repo.create({ stateName, sysCountryId });
        const saved = await repo.save(entity);
        map.set(key, saved.id);
      }
    }
    return map;
  }

  private getUniqueCityPairs(
    rows: ValidatedUniversityCsvRow[],
    countryMap: Map<string, string>,
    stateMap: Map<string, string>,
  ): { cityName: string; sysStateId: string }[] {
    const seen = new Set<string>();
    const result: { cityName: string; sysStateId: string }[] = [];
    for (const row of rows) {
      const countryName = row.countryName.trim();
      const stateName = row.stateName.trim();
      const cityName = row.cityName.trim();
      if (!countryName || !stateName || !cityName) continue;
      const sysCountryId = countryMap.get(countryName.toLowerCase());
      if (!sysCountryId) continue;
      const stateCacheKey = stateKey(sysCountryId, stateName);
      const sysStateId = stateMap.get(stateCacheKey);
      if (!sysStateId) continue;
      const key = cityKey(sysStateId, cityName);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ cityName, sysStateId });
    }
    return result;
  }

  private async resolveCities(
    manager: EntityManager,
    pairs: { cityName: string; sysStateId: string }[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysCities);
    const map = new Map<string, string>();
    for (const { cityName, sysStateId } of pairs) {
      const key = cityKey(sysStateId, cityName);
      const existingEntity = await repo.findOne({ where: { cityName, sysStateId } });
      if (existingEntity) {
        map.set(key, existingEntity.id);
      } else {
        const entity = repo.create({ cityName, sysStateId });
        const saved = await repo.save(entity);
        map.set(key, saved.id);
      }
    }
    return map;
  }
}