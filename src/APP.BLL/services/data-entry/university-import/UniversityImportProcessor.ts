/**
 * Resolves country/state/city and university entities from CSV rows and persists them. Splits rows into reviewed vs error.
 */

import { Injectable, Inject } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysStates } from '@entity/entities/SysStates.entity';
import { SysCities } from '@entity/entities/SysCities.entity';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { CommissionType } from '@shared/enums/CommissionType.enum';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import type { ICsvImportProcessor } from '../bulk-import/abstractions/CsvImportProcessor.interface';
import type { CsvRecord, CsvProcessingResult } from '../bulk-import/abstractions/CsvImportProcessor.interface';

/** Log prefix for bulk import processor (grep-friendly). */
const LOG_CONTEXT = '[BulkImport:University:Processor]';

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

const VALID_COMMISSION_TYPES = [CommissionType.AMOUNT, CommissionType.PERCENTAGE] as const;

interface LocationMaps {
  countryMap: Map<string, string>;
  stateMap: Map<string, string>;
  cityMap: Map<string, string>;
}

/** One university row with resolved location IDs, used when resolving/upserting universities. */
interface ResolvedUniversityRow {
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

  /**
   * Resolves locations and universities from CSV rows, persists them, and returns reviewed rows (with IDs) and error rows (with errorReason).
   * Commission/commissionType are validated early so rows that fail format do not go through heavy resolution.
   */
  async processRows(manager: EntityManager, rows: CsvRecord[]): Promise<CsvProcessingResult> {
    const { valid: formatValidRows, invalid: formatErrorRows } = this.partitionRowsByCommissionFormat(rows);
    const locationMaps = await this.resolveLocationHierarchy(manager, formatValidRows);
    const universityIdByKey = await this.resolveUniversityEntities(manager, formatValidRows, locationMaps);
    const { reviewedRows, errorRows: resolutionErrorRows } = this.buildFinalRows(
      formatValidRows,
      locationMaps,
      universityIdByKey,
    );
    return {
      reviewedRows,
      errorRows: [...formatErrorRows, ...resolutionErrorRows],
    };
  }

  /**
   * Partitions rows by commission/commissionType format validation. Rows that fail never go through resolution.
   */
  private partitionRowsByCommissionFormat(rows: CsvRecord[]): {
    valid: CsvRecord[];
    invalid: (CsvRecord & { errorReason: string })[];
  } {
    const valid: CsvRecord[] = [];
    const invalid: (CsvRecord & { errorReason: string })[] = [];
    for (const row of rows) {
      const reason = this.validateCommissionColumns(row);
      if (reason) {
        invalid.push({ ...row, errorReason: reason });
      } else {
        valid.push(row);
      }
    }
    if (invalid.length > 0) {
      this.logger.info(`${LOG_CONTEXT} Early format validation: ${invalid.length} row(s) failed commission/commissionType.`);
    }
    return { valid, invalid };
  }

  /** Resolves unique countries, then states, then cities from rows and returns ID maps. */
  private async resolveLocationHierarchy(
    manager: EntityManager,
    rows: CsvRecord[],
  ): Promise<LocationMaps> {
    const uniqueCountryNames = [...new Set(rows.map((row) => row.countryName?.trim()).filter(Boolean))];
    this.logger.info(`${LOG_CONTEXT} Resolving countries: ${uniqueCountryNames.length} unique name(s)...`);
    const countryMap = await this.resolveCountries(manager, uniqueCountryNames);

    const statePairs = this.getUniqueStatePairs(rows, countryMap);
    this.logger.info(`${LOG_CONTEXT} Resolving states: ${statePairs.length} unique (state, countryId)...`);
    const stateMap = await this.resolveStates(manager, statePairs);

    const cityPairs = this.getUniqueCityPairs(rows, countryMap, stateMap);
    this.logger.info(`${LOG_CONTEXT} Resolving cities: ${cityPairs.length} unique (city, stateId)...`);
    const cityMap = await this.resolveCities(manager, cityPairs);

    return { countryMap, stateMap, cityMap };
  }

  /** Resolves unique universities from rows and returns map of cache key → university id. */
  private async resolveUniversityEntities(
    manager: EntityManager,
    rows: CsvRecord[],
    locationMaps: LocationMaps,
  ): Promise<Map<string, string>> {
    const { countryMap, stateMap, cityMap } = locationMaps;
    const uniqueUniKeys = this.getUniqueUniKeys(rows, countryMap, stateMap, cityMap);
    this.logger.info(`${LOG_CONTEXT} Resolving universities: ${uniqueUniKeys.length} unique (uniName, location)...`);
    return this.resolveUniversities(manager, uniqueUniKeys);
  }

  /** Splits rows into reviewed (with resolved IDs) and error (with errorReason) using location and university maps. */
  private buildFinalRows(
    rows: CsvRecord[],
    { countryMap, stateMap, cityMap }: LocationMaps,
    universityIdByKey: Map<string, string>,
  ): CsvProcessingResult {
    const reviewedRows: (CsvRecord & { sysCountryId: string; sysStateId: string; sysCityId: string; id: string })[] = [];
    const errorRows: (CsvRecord & { errorReason: string })[] = [];
    const seenUniKeys = new Set<string>();

    for (const row of rows) {
      const reason = this.getRowErrorReason(row, countryMap, stateMap, cityMap, universityIdByKey, seenUniKeys);
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
      const uniId = universityIdByKey.get(key)!;
      reviewedRows.push({ ...row, sysCountryId, sysStateId, sysCityId, id: uniId });
    }

    this.logger.info(
      `${LOG_CONTEXT} Processed rows: ${reviewedRows.length} reviewed, ${errorRows.length} errors`,
    );
    return { reviewedRows, errorRows };
  }

  /** Returns a human-readable error reason for the row, or null if the row is valid. */
  private getRowErrorReason(
    row: CsvRecord,
    countryMap: Map<string, string>,
    stateMap: Map<string, string>,
    cityMap: Map<string, string>,
    universityIdByKey: Map<string, string>,
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

    const columnError = this.validateCommissionColumns(row);
    if (columnError) return columnError;

    const sysCountryId = countryMap.get(countryName.toLowerCase());
    if (!sysCountryId) return 'country not found';

    const sysStateId = stateMap.get(stateKey(sysCountryId, stateName));
    if (!sysStateId) return 'state not found for country';

    const sysCityId = cityMap.get(cityKey(sysStateId, cityName));
    if (!sysCityId) return 'city not found for state';

    const key = uniKey(uniName, sysCountryId, sysCityId);
    const uniId = universityIdByKey.get(key);
    if (!uniId) return 'university resolution failed';
    if (seenUniKeys.has(key)) return 'duplicate row';

    return null;
  }

  private getMissingRequiredUniFields(row: CsvRecord): string[] {
    return REQUIRED_UNI_FIELDS.filter((field) => {
      const fieldValue = row[field];
      return fieldValue === undefined || fieldValue === null || String(fieldValue).trim() === '';
    });
  }

  /**
   * Validates commission (must be a number) and commissionType (must be AMOUNT or PERCENTAGE).
   * @returns Error message or null if valid.
   */
  private validateCommissionColumns(row: CsvRecord): string | null {
    const commissionRaw = String(row.commission ?? '').trim();
    const num = Number(commissionRaw);
    if (commissionRaw === '' || Number.isNaN(num)) {
      return "commission must be a number";
    }

    const commissionType = String(row.commissionType ?? '').trim();
    if (!VALID_COMMISSION_TYPES.includes(commissionType as (typeof VALID_COMMISSION_TYPES)[number])) {
      return `commissionType must be ${VALID_COMMISSION_TYPES.join(' or ')}`;
    }
    return null;
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

  private getUniqueUniKeys(
    rows: CsvRecord[],
    countryMap: Map<string, string>,
    stateMap: Map<string, string>,
    cityMap: Map<string, string>,
  ): ResolvedUniversityRow[] {
    const seen = new Set<string>();
    const result: ResolvedUniversityRow[] = [];
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
        this.logger.info(`${LOG_CONTEXT}   "${name}" → found id ${existing.id}`);
        map.set(name.toLowerCase(), existing.id);
      } else {
        const entity = repo.create({ countryName: name });
        const saved = await repo.save(entity);
        this.logger.info(`${LOG_CONTEXT}   "${name}" → inserted, id ${saved.id}`);
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
        this.logger.info(`${LOG_CONTEXT}   "${stateName}" (country: ${sysCountryId}) → found id ${existing.id}`);
        map.set(key, existing.id);
      } else {
        const entity = repo.create({ stateName, sysCountryId });
        const saved = await repo.save(entity);
        this.logger.info(`${LOG_CONTEXT}   "${stateName}" (country: ${sysCountryId}) → inserted, id ${saved.id}`);
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
        this.logger.info(`${LOG_CONTEXT}   "${cityName}" (state: ${sysStateId}) → found id ${existing.id}`);
        map.set(key, existing.id);
      } else {
        const entity = repo.create({ cityName, sysStateId });
        const saved = await repo.save(entity);
        this.logger.info(`${LOG_CONTEXT}   "${cityName}" (state: ${sysStateId}) → inserted, id ${saved.id}`);
        map.set(key, saved.id);
      }
    }
    return map;
  }

  /** Upserts universities for the given resolved rows; returns map of cache key → university id. */
  private async resolveUniversities(
    manager: EntityManager,
    resolvedRows: ResolvedUniversityRow[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysUniversities);
    const map = new Map<string, string>();

    for (const universityRow of resolvedRows) {
      const { uniName, sysCountryId, sysStateId, sysCityId } = universityRow;
      const mapKey = uniKey(uniName, sysCountryId, sysCityId);
      const existing = await repo.findOne({
        where: { uniName, sysCountryId, sysCityId },
      });
      const campusLifeLinksArr = universityRow.campusLifeLinks
        ? universityRow.campusLifeLinks.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const commissionType =
        universityRow.commissionType === 'AMOUNT'
          ? CommissionType.AMOUNT
          : universityRow.commissionType === 'PERCENTAGE'
            ? CommissionType.PERCENTAGE
            : undefined;
      const updatePayload = {
        commission: universityRow.commission || undefined,
        commissionType,
        logoUrl: universityRow.logoUrl || undefined,
        website: universityRow.website || undefined,
        aboutUs: universityRow.aboutUs || undefined,
        address: universityRow.address || undefined,
        coverImageUrl: universityRow.coverImageUrl || undefined,
        campusLifeLinks: campusLifeLinksArr.length > 0 ? campusLifeLinksArr : undefined,
      };

      if (existing) {
        Object.assign(existing, updatePayload);
        const saved = await repo.save(existing);
        this.logger.info(`${LOG_CONTEXT}   "${uniName}" (country: ${sysCountryId}, city: ${sysCityId}) → updated id ${saved.id}`);
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
        this.logger.info(`${LOG_CONTEXT}   "${uniName}" (country: ${sysCountryId}, city: ${sysCityId}) → inserted, id ${saved.id}`);
        map.set(mapKey, saved.id);
      }
    }
    return map;
  }
}
