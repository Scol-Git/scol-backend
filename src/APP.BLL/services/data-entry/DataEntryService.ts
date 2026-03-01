import { Injectable, Inject, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { EntityManager } from 'typeorm';
import * as path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysStates } from '@entity/entities/SysStates.entity';
import { SysCities } from '@entity/entities/SysCities.entity';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { CommissionType } from '@shared/enums/CommissionType.enum';

const LOG_PREFIX = '[Data Entry]';
const DATA_DIR = path.join(process.cwd(), 'data');

interface UniCsvRow {
  [key: string]: string;
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

export interface DataEntryImportResult {
  reviewedCsv: Buffer;
  errorsCsv: Buffer;
  reviewedCount: number;
  errorsCount: number;
}

const REQUIRED_HEADERS = ['countryName', 'stateName', 'cityName', 'uniName'];

/** Required on each row for uni entry; if any is null/empty the row is an error and we do not entry the uni */
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

@Injectable()
export class DataEntryService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async importUniCsv(uniCsvUrl: string): Promise<DataEntryImportResult> {
    try {
      return await this.doImportUniCsv(uniCsvUrl);
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (this.isNotCsvFileError(err)) {
        throw new BadRequestException(
          'The URL does not point to a valid CSV file. For Google Sheets, use the export link: .../export?format=csv&gid=0',
        );
      }
      this.logger.LogError('Uni CSV import failed', err as Error, { uniCsvUrl });
      throw new ServiceUnavailableException(
        'Service temporarily unavailable. Please try again later.',
      );
    }
  }

  private isNotCsvFileError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      msg.includes('Invalid Opening Quote') ||
      msg.includes('quote is found on field') ||
      msg.includes('INVALID_OPENING_QUOTE')
    );
  }

  private async doImportUniCsv(uniCsvUrl: string): Promise<DataEntryImportResult> {
    this.logger.info(`${LOG_PREFIX} Starting uni import from URL: ${uniCsvUrl}`);

    // 1. Fetch CSV and save to data folder (live update)
    this.logger.info(`${LOG_PREFIX} Fetching uni CSV...`);
    const csvText = await this.fetchCsv(uniCsvUrl);
    this.logger.info(`${LOG_PREFIX} Fetched ${Buffer.byteLength(csvText, 'utf-8')} bytes`);
    await this.ensureDataDir();
    await writeFile(path.join(DATA_DIR, 'uni-source.csv'), csvText, 'utf-8');
    this.logger.info(`${LOG_PREFIX} Wrote data/uni-source.csv`);

    // 2. Parse CSV
    this.logger.info(`${LOG_PREFIX} Parsing CSV...`);
    const rows: UniCsvRow[] = this.parseCsv(csvText);
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
    this.logger.info(`${LOG_PREFIX} Parsed ${rows.length} rows, headers: ${headers.join(', ')}`);

    // 3. Validate headers
    const missingHeaders = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `Missing required CSV headers: ${missingHeaders.join(', ')}. Found: ${headers.join(', ')}`,
      );
    }

    // 4. Process rows inside a transaction
    const reviewedRows: (UniCsvRow & Record<string, string>)[] = [];
    const errorRows: (UniCsvRow & { errorReason: string })[] = [];

    await this.db.transaction(async (manager) => {
      // 4a. Resolve countries
      const uniqueCountryNames = [...new Set(rows.map((r) => r.countryName?.trim()).filter(Boolean))];
      this.logger.info(`${LOG_PREFIX} Resolving countries: ${uniqueCountryNames.length} unique name(s)...`);
      const countryMap = await this.resolveCountries(manager, uniqueCountryNames);

      // 4b. Resolve states
      const uniqueStatePairs = this.getUniqueStatePairs(rows, countryMap);
      this.logger.info(`${LOG_PREFIX} Resolving states: ${uniqueStatePairs.length} unique (state, countryId)...`);
      const stateMap = await this.resolveStates(manager, uniqueStatePairs);

      // 4c. Resolve cities
      const uniqueCityPairs = this.getUniqueCityPairs(rows, countryMap, stateMap);
      this.logger.info(`${LOG_PREFIX} Resolving cities: ${uniqueCityPairs.length} unique (city, stateId)...`);
      const cityMap = await this.resolveCities(manager, uniqueCityPairs);

      // 4d. Resolve universities
      const uniqueUniKeys = this.getUniqueUniKeys(rows, countryMap, stateMap, cityMap);
      this.logger.info(`${LOG_PREFIX} Resolving universities: ${uniqueUniKeys.length} unique (uniName, location)...`);
      const uniMap = await this.resolveUniversities(manager, uniqueUniKeys);

      // 4e. Process each row (duplicates by uniName+location go to errors, reviewed has each unique once)
      const seenUniKeys = new Set<string>();
      for (const row of rows) {
        const countryName = row.countryName?.trim();
        const stateName = row.stateName?.trim();
        const cityName = row.cityName?.trim();
        const uniName = row.uniName?.trim();

        // Validate required fields
        if (!countryName) {
          errorRows.push({ ...row, errorReason: 'no country name found' });
          continue;
        }
        if (!stateName) {
          errorRows.push({ ...row, errorReason: 'no state name found' });
          continue;
        }
        if (!cityName) {
          errorRows.push({ ...row, errorReason: 'no city name found' });
          continue;
        }
        if (!uniName) {
          errorRows.push({ ...row, errorReason: 'no university name found' });
          continue;
        }

        const missingUniFields = this.getMissingRequiredUniFields(row);
        if (missingUniFields.length > 0) {
          errorRows.push({
            ...row,
            errorReason: `missing required field(s): ${missingUniFields.join(', ')}`,
          });
          continue;
        }

        const sysCountryId = countryMap.get(countryName.toLowerCase());
        if (!sysCountryId) {
          errorRows.push({ ...row, errorReason: 'country not found' });
          continue;
        }

        const stateKey = `${sysCountryId}::${stateName.toLowerCase()}`;
        const sysStateId = stateMap.get(stateKey);
        if (!sysStateId) {
          errorRows.push({ ...row, errorReason: 'state not found for country' });
          continue;
        }

        const cityKey = `${sysStateId}::${cityName.toLowerCase()}`;
        const sysCityId = cityMap.get(cityKey);
        if (!sysCityId) {
          errorRows.push({ ...row, errorReason: 'city not found for state' });
          continue;
        }

        const uniKey = `${uniName.toLowerCase()}::${sysCountryId}::${sysCityId}`;
        const uniId = uniMap.get(uniKey);
        if (!uniId) {
          errorRows.push({ ...row, errorReason: 'university resolution failed' });
          continue;
        }

        if (seenUniKeys.has(uniKey)) {
          errorRows.push({ ...row, errorReason: 'duplicate row' });
          continue;
        }
        seenUniKeys.add(uniKey);

        reviewedRows.push({
          ...row,
          sysCountryId,
          sysStateId,
          sysCityId,
          id: uniId,
        });
      }
    });

    this.logger.info(
      `${LOG_PREFIX} Processed rows: ${reviewedRows.length} reviewed, ${errorRows.length} errors`,
    );

    // 5. Generate CSV buffers and write to data folder (live update)
    const reviewedCsv = this.toCsvBuffer(reviewedRows, [
      ...headers,
      'sysCountryId',
      'sysStateId',
      'sysCityId',
      'id',
    ]);
    const errorsCsv = this.toCsvBuffer(errorRows, [...headers, 'errorReason']);

    await writeFile(path.join(DATA_DIR, 'uni-reviewed.csv'), reviewedCsv);
    this.logger.info(`${LOG_PREFIX} Wrote data/uni-reviewed.csv (${reviewedRows.length} rows)`);
    await writeFile(path.join(DATA_DIR, 'uni-errors.csv'), errorsCsv);
    this.logger.info(`${LOG_PREFIX} Wrote data/uni-errors.csv (${errorRows.length} rows)`);

    return {
      reviewedCsv,
      errorsCsv,
      reviewedCount: reviewedRows.length,
      errorsCount: errorRows.length,
    };
  }

  private async ensureDataDir(): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true });
  }

  // ──────────────────────────────────────────────
  // CSV fetch & parse
  // ──────────────────────────────────────────────

  /**
   * Converts Google Drive / Sheets share links to direct download URLs so we get
   * the file content instead of the HTML page.
   */
  private resolveCsvUrl(url: string): string {
    try {
      const u = new URL(url);
      // Google Drive file: .../file/d/FILE_ID/view...
      const driveFileMatch = u.pathname.match(/^\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (u.hostname === 'drive.google.com' && driveFileMatch) {
        const fileId = driveFileMatch[1];
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
      // Google Drive open: .../open?id=FILE_ID
      if (u.hostname === 'drive.google.com' && u.pathname === '/open' && u.searchParams.has('id')) {
        const fileId = u.searchParams.get('id')!;
        return `https://drive.google.com/uc?export=download&id=${fileId}`;
      }
      // Google Sheets edit: .../d/SPREADSHEET_ID/edit...
      const sheetsMatch = u.pathname.match(/^\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
      if (u.hostname === 'docs.google.com' && sheetsMatch) {
        const sheetId = sheetsMatch[1];
        const gid = u.searchParams.get('gid') ?? '0';
        return `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
      }
    } catch {
      // Invalid URL; let fetch fail
    }
    return url;
  }

  private async fetchCsv(url: string): Promise<string> {
    const resolvedUrl = this.resolveCsvUrl(url);
    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      throw new BadRequestException(
        `Failed to fetch CSV from URL: ${response.status} ${response.statusText}`,
      );
    }
    const text = await response.text();
    const normalized = text.replace(/^\uFEFF/, '');
    if (this.looksLikeHtml(normalized.trim())) {
      throw new BadRequestException(
        'The URL does not point to a valid CSV file. The response appears to be HTML (e.g. a web page). For Google Sheets, use the export link: .../export?format=csv&gid=0',
      );
    }
    return normalized;
  }

  private looksLikeHtml(text: string): boolean {
    const start = text.slice(0, 200).toLowerCase();
    return start.startsWith('<!doctype') || start.startsWith('<html');
  }

  private parseCsv(csvText: string): UniCsvRow[] {
    return parse(csvText, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true,
    });
  }

  // ──────────────────────────────────────────────
  // Unique key builders
  // ──────────────────────────────────────────────

  private getUniqueStatePairs(
    rows: UniCsvRow[],
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
      const key = `${sysCountryId}::${stateName.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({ stateName, sysCountryId });
      }
    }
    return result;
  }

  private getUniqueCityPairs(
    rows: UniCsvRow[],
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
      const stateKey = `${sysCountryId}::${stateName.toLowerCase()}`;
      const sysStateId = stateMap.get(stateKey);
      if (!sysStateId) continue;
      const cityKey = `${sysStateId}::${cityName.toLowerCase()}`;
      if (!seen.has(cityKey)) {
        seen.add(cityKey);
        result.push({ cityName, sysStateId });
      }
    }
    return result;
  }

  private getUniqueUniKeys(
    rows: UniCsvRow[],
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
      const stateKey = `${sysCountryId}::${stateName.toLowerCase()}`;
      const sysStateId = stateMap.get(stateKey);
      if (!sysStateId) continue;
      const cityKey = `${sysStateId}::${cityName.toLowerCase()}`;
      const sysCityId = cityMap.get(cityKey);
      if (!sysCityId) continue;

      const uniKey = `${uniName.toLowerCase()}::${sysCountryId}::${sysCityId}`;
      if (!seen.has(uniKey)) {
        seen.add(uniKey);
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
    }
    return result;
  }

  private getMissingRequiredUniFields(row: UniCsvRow): string[] {
    return REQUIRED_UNI_FIELDS.filter((f) => {
      const v = row[f];
      return v === undefined || v === null || String(v).trim() === '';
    });
  }

  // ──────────────────────────────────────────────
  // Entity resolution (lookup or insert)
  // ──────────────────────────────────────────────

  private async resolveCountries(
    manager: EntityManager,
    uniqueNames: string[],
  ): Promise<Map<string, string>> {
    const repo = manager.getRepository(SysCountries);
    const map = new Map<string, string>();

    for (const name of uniqueNames) {
      const existing = await repo.findOne({
        where: { countryName: name },
      });
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
      const key = `${sysCountryId}::${stateName.toLowerCase()}`;
      const existing = await repo.findOne({
        where: { stateName, sysCountryId },
      });
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
      const key = `${sysStateId}::${cityName.toLowerCase()}`;
      const existing = await repo.findOne({
        where: { cityName, sysStateId },
      });
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
      const mapKey = `${uniName.toLowerCase()}::${sysCountryId}::${sysCityId}`;
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

  // ──────────────────────────────────────────────
  // CSV output
  // ──────────────────────────────────────────────

  private toCsvBuffer(rows: Record<string, string>[], headers: string[]): Buffer {
    if (rows.length === 0) {
      return Buffer.from(headers.join(',') + '\n', 'utf-8');
    }

    const lines: string[] = [headers.join(',')];
    for (const row of rows) {
      const values = headers.map((h) => this.escapeCsvValue(row[h] ?? ''));
      lines.push(values.join(','));
    }
    return Buffer.from(lines.join('\n') + '\n', 'utf-8');
  }

  private escapeCsvValue(value: string): string {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
}
