import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysStates } from '@entity/entities/SysStates.entity';
import { SysCities } from '@entity/entities/SysCities.entity';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { CommissionType } from '@shared/enums/CommissionType.enum';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import type { ICsvImportProcessor } from '../bulk-import/abstractions/ICsvImportProcessor';
import type { CsvRecord, CsvProcessingResult } from '../bulk-import/abstractions/ICsvImportProcessor';

const LOG_PREFIX = '[Data Entry]';

const REQUIRED_UNI_FIELDS = [
  'commission',
  'commissionType',
  'logoUrl',
  'website',
  'aboutUs',
  'address',
  'coverImageUrl',
  'campusLifeLinks',
] as const;

interface LocationMaps {
  countryMap: Map<string, string>;
  stateMap: Map<string, string>;
  cityMap: Map<string, string>;
}

interface UniKeyWithExtra {
  uniName: string;
  sysCountryId: string;
  sysStateId: string;
  sysCityId: string;
  commission: string;
  commissionType: string;
  logoUrl: string;
  website: string;
  aboutUs: string;
  address: string;
  coverImageUrl: string;
  campusLifeLinks: string;
}

function stateKey(sysCountryId: string, stateName: string): string {
  return `${sysCountryId}::${stateName.toLowerCase()}`;
}

function cityKey(sysStateId: string, cityName: string): string {
  return `${sysStateId}::${cityName.toLowerCase()}`;
}

function uniKey(uniName: string, sysCountryId: string, sysCityId: string): string {
  return `${uniName.toLowerCase()}::${sysCountryId}::${sysCityId}`;
}

@Injectable()
export class UniversityImportProcessor implements ICsvImportProcessor {
  constructor(
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async processRows(manager: EntityManager, rows: CsvRecord[]): Promise<CsvProcessingResult> {
    const locationMaps = await this.resolveLocationHierarchy(manager, rows);
    const uniMap = await this.resolveUniversityEntities(manager, rows, locationMaps);
    return this.buildFinalRows(rows, locationMaps, uniMap);
  }

  private async resolveLocationHierarchy(
    manager: EntityManager,
    rows: CsvRecord[],
  ): Promise<LocationMaps> {
    const uniqueCountryNames = [...new Set(rows.map((r) => r.countryName?.trim()).filter(Boolean))];
    this.logger.info(`${LOG_PREFIX} Resolving countries: ${uniqueCountryNames.length} unique name(s)...`);
    const countryMap = await this.resolveCountries(manager, uniqueCountryNames);

    const statePairs = this.getUniqueStatePairs(rows, countryMap);
    this.logger.info(`${LOG_PREFIX} Resolving states: ${statePairs.length} unique (state, countryId)...`);
    const stateMap = await this.resolveStates(manager, statePairs);

    const cityPairs = this.getUniqueCityPairs(rows, countryMap, stateMap);
    this.logger.info(`${LOG_PREFIX} Resolving cities: ${cityPairs.length} unique (city, stateId)...`);
    const cityMap = await this.resolveCities(manager, cityPairs);

    return { countryMap, stateMap, cityMap };
  }

  private async resolveUniversityEntities(
    manager: EntityManager,
    rows: CsvRecord[],
    locationMaps: LocationMaps,
  ): Promise<Map<string, string>> {
    const { countryMap, stateMap, cityMap } = locationMaps;
    const uniqueUniKeys = this.getUniqueUniKeys(rows, countryMap, stateMap, cityMap);
    this.logger.info(`${LOG_PREFIX} Resolving universities: ${uniqueUniKeys.length} unique (uniName, location)...`);
    return this.resolveUniversities(manager, uniqueUniKeys);
  }

  private buildFinalRows(
    rows: CsvRecord[],
    { countryMap, stateMap, cityMap }: LocationMaps,
    uniMap: Map<string, string>,
  ): CsvProcessingResult {
    const reviewedRows: (CsvRecord & { sysCountryId: string; sysStateId: string; sysCityId: string; id: string })[] = [];
    const errorRows: (CsvRecord & { errorReason: string })[] = [];
    const seenUniKeys = new Set<string>();

    for (const row of rows) {
      const reason = this.getRowErrorReason(row, countryMap, stateMap, cityMap, uniMap, seenUniKeys);
      if (reason) {
        errorRows.push({ ...row, errorReason: reason });
        continue;
      }
      const countryName = row.countryName!.trim();
      const stateName = row.stateName!.trim();
      const cityName = row.cityName!.trim();
      const uniName = row.uniName!.trim();
      const sysCountryId = countryMap.get(countryName.toLowerCase())!;
      const sysStateId = stateMap.get(stateKey(sysCountryId, stateName))!;
      const sysCityId = cityMap.get(cityKey(sysStateId, cityName))!;
      const key = uniKey(uniName, sysCountryId, sysCityId);
      seenUniKeys.add(key);
      const uniId = uniMap.get(key)!;
      reviewedRows.push({ ...row, sysCountryId, sysStateId, sysCityId, id: uniId });
    }

    this.logger.info(
      `${LOG_PREFIX} Processed rows: ${reviewedRows.length} reviewed, ${errorRows.length} errors`,
    );
    return { reviewedRows, errorRows };
  }

  private getRowErrorReason(
    row: CsvRecord,
    countryMap: Map<string, string>,
    stateMap: Map<string, string>,
    cityMap: Map<string, string>,
    uniMap: Map<string, string>,
    seenUniKeys: Set<string>,
  ): string | null {
    const countryName = row.countryName?.trim();
    const stateName = row.stateName?.trim();
    const cityName = row.cityName?.trim();
    const uniName = row.uniName?.trim();

    if (!countryName) return 'no country name found';
    if (!stateName) return 'no state name found';
    if (!cityName) return 'no city name found';
    if (!uniName) return 'no university name found';

    const missingUniFields = this.getMissingRequiredUniFields(row);
    if (missingUniFields.length > 0) {
      return `missing required field(s): ${missingUniFields.join(', ')}`;
    }

    const sysCountryId = countryMap.get(countryName.toLowerCase());
    if (!sysCountryId) return 'country not found';

    const sysStateId = stateMap.get(stateKey(sysCountryId, stateName));
    if (!sysStateId) return 'state not found for country';

    const sysCityId = cityMap.get(cityKey(sysStateId, cityName));
    if (!sysCityId) return 'city not found for state';

    const key = uniKey(uniName, sysCountryId, sysCityId);
    const uniId = uniMap.get(key);
    if (!uniId) return 'university resolution failed';
    if (seenUniKeys.has(key)) return 'duplicate row';

    return null;
  }

  private getMissingRequiredUniFields(row: CsvRecord): string[] {
    return REQUIRED_UNI_FIELDS.filter((f) => {
      const v = row[f];
      return v === undefined || v === null || String(v).trim() === '';
    });
  }

  private getUniqueStatePairs(
    rows: CsvRecord[],
    countryMap: Map<string, string>,
  ): { stateName: string; sysCountryId: string }[] {
    const seen = new Set<string>();
    const result: { stateName: string; sysCountryId: string }[] = [];
    for (const row of rows) {
      const countryName = row.countryName?.trim();
      const stateName = row.stateName?.trim();
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

  private getUniqueCityPairs(
    rows: CsvRecord[],
    countryMap: Map<string, string>,
    stateMap: Map<string, string>,
  ): { cityName: string; sysStateId: string }[] {
    const seen = new Set<string>();
    const result: { cityName: string; sysStateId: string }[] = [];
    for (const row of rows) {
      const countryName = row.countryName?.trim();
      const stateName = row.stateName?.trim();
      const cityName = row.cityName?.trim();
      if (!countryName || !stateName || !cityName) continue;
      const sysCountryId = countryMap.get(countryName.toLowerCase());
      if (!sysCountryId) continue;
      const stKey = stateKey(sysCountryId, stateName);
      const sysStateId = stateMap.get(stKey);
      if (!sysStateId) continue;
      const key = cityKey(sysStateId, cityName);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({ cityName, sysStateId });
    }
    return result;
  }

  private getUniqueUniKeys(
    rows: CsvRecord[],
    countryMap: Map<string, string>,
    stateMap: Map<string, string>,
    cityMap: Map<string, string>,
  ): UniKeyWithExtra[] {
    const seen = new Set<string>();
    const result: UniKeyWithExtra[] = [];
    for (const row of rows) {
      const countryName = row.countryName?.trim();
      const stateName = row.stateName?.trim();
      const cityName = row.cityName?.trim();
      const uniName = row.uniName?.trim();
      if (!countryName || !stateName || !cityName || !uniName) continue;
      if (this.getMissingRequiredUniFields(row).length > 0) continue;

      const sysCountryId = countryMap.get(countryName.toLowerCase());
      if (!sysCountryId) continue;
      const sysStateId = stateMap.get(stateKey(sysCountryId, stateName));
      if (!sysStateId) continue;
      const sysCityId = cityMap.get(cityKey(sysStateId, cityName));
      if (!sysCityId) continue;

      const key = uniKey(uniName, sysCountryId, sysCityId);
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        uniName,
        sysCountryId,
        sysStateId,
        sysCityId,
        commission: row.commission?.trim() ?? '',
        commissionType: row.commissionType?.trim() ?? '',
        logoUrl: row.logoUrl?.trim() ?? '',
        website: row.website?.trim() ?? '',
        aboutUs: row.aboutUs?.trim() ?? '',
        address: row.address?.trim() ?? '',
        coverImageUrl: row.coverImageUrl?.trim() ?? '',
        campusLifeLinks: row.campusLifeLinks?.trim() ?? '',
      });
    }
    return result;
  }

  private async resolveCountries(
    manager: EntityManager,
    uniqueNames: string[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysCountries);
    const map = new Map<string, string>();
    for (const name of uniqueNames) {
      const existing = await repo.findOne({ where: { countryName: name } });
      if (existing) {
        this.logger.info(`${LOG_PREFIX}   "${name}" → found id ${existing.id}`);
        map.set(name.toLowerCase(), existing.id);
      } else {
        const entity = repo.create({ countryName: name });
        const saved = await repo.save(entity);
        this.logger.info(`${LOG_PREFIX}   "${name}" → inserted, id ${saved.id}`);
        map.set(name.toLowerCase(), saved.id);
      }
    }
    return map;
  }

  private async resolveStates(
    manager: EntityManager,
    pairs: { stateName: string; sysCountryId: string }[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysStates);
    const map = new Map<string, string>();
    for (const { stateName, sysCountryId } of pairs) {
      const key = stateKey(sysCountryId, stateName);
      const existing = await repo.findOne({ where: { stateName, sysCountryId } });
      if (existing) {
        this.logger.info(`${LOG_PREFIX}   "${stateName}" (country: ${sysCountryId}) → found id ${existing.id}`);
        map.set(key, existing.id);
      } else {
        const entity = repo.create({ stateName, sysCountryId });
        const saved = await repo.save(entity);
        this.logger.info(`${LOG_PREFIX}   "${stateName}" (country: ${sysCountryId}) → inserted, id ${saved.id}`);
        map.set(key, saved.id);
      }
    }
    return map;
  }

  private async resolveCities(
    manager: EntityManager,
    pairs: { cityName: string; sysStateId: string }[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysCities);
    const map = new Map<string, string>();
    for (const { cityName, sysStateId } of pairs) {
      const key = cityKey(sysStateId, cityName);
      const existing = await repo.findOne({ where: { cityName, sysStateId } });
      if (existing) {
        this.logger.info(`${LOG_PREFIX}   "${cityName}" (state: ${sysStateId}) → found id ${existing.id}`);
        map.set(key, existing.id);
      } else {
        const entity = repo.create({ cityName, sysStateId });
        const saved = await repo.save(entity);
        this.logger.info(`${LOG_PREFIX}   "${cityName}" (state: ${sysStateId}) → inserted, id ${saved.id}`);
        map.set(key, saved.id);
      }
    }
    return map;
  }

  private async resolveUniversities(
    manager: EntityManager,
    keys: UniKeyWithExtra[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysUniversities);
    const map = new Map<string, string>();

    for (const key of keys) {
      const { uniName, sysCountryId, sysStateId, sysCityId } = key;
      const mapKey = uniKey(uniName, sysCountryId, sysCityId);
      const existing = await repo.findOne({
        where: { uniName, sysCountryId, sysCityId },
      });
      const campusLifeLinksArr = key.campusLifeLinks
        ? key.campusLifeLinks.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const commissionType =
        key.commissionType === 'AMOUNT'
          ? CommissionType.AMOUNT
          : key.commissionType === 'PERCENTAGE'
            ? CommissionType.PERCENTAGE
            : undefined;
      const updatePayload = {
        commission: key.commission || undefined,
        commissionType,
        logoUrl: key.logoUrl || undefined,
        website: key.website || undefined,
        aboutUs: key.aboutUs || undefined,
        address: key.address || undefined,
        coverImageUrl: key.coverImageUrl || undefined,
        campusLifeLinks: campusLifeLinksArr.length > 0 ? campusLifeLinksArr : undefined,
      };

      if (existing) {
        Object.assign(existing, updatePayload);
        const saved = await repo.save(existing);
        this.logger.info(`${LOG_PREFIX}   "${uniName}" (country: ${sysCountryId}, city: ${sysCityId}) → updated id ${saved.id}`);
        map.set(mapKey, saved.id);
      } else {
        const entity = repo.create({
          uniName,
          sysCountryId,
          sysStateId,
          sysCityId,
          ...updatePayload,
        });
        const saved = await repo.save(entity);
        this.logger.info(`${LOG_PREFIX}   "${uniName}" (country: ${sysCountryId}, city: ${sysCityId}) → inserted, id ${saved.id}`);
        map.set(mapKey, saved.id);
      }
    }
    return map;
  }
}
