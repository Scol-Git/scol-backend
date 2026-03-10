import { Injectable } from '@nestjs/common';
import { CommissionType } from '@shared/enums/CommissionType.enum';
import type { UniversityCsvRow, ErrorUniversityRow } from '../dto/UniversityCsvRow';

const REQUIRED_FIELDS: (keyof UniversityCsvRow)[] = [
  'commission',
  'commissionType',
  'logoUrl',
  'website',
  'aboutUs',
  'address',
  'coverImageUrl',
  'campusLifeLinks',
  'rankingMetaData',
  'locationMapMetaData',
  'establishedYear',
  'universityType',
  'currRanking',
];

const VALID_COMMISSION_TYPES = [CommissionType.AMOUNT, CommissionType.PERCENTAGE] as const;

@Injectable()
export class UniversityRowValidator {
  /**
   * Validates that all required fields are present and non-empty.
   * @returns Error message e.g. "missing required field(s): commission, website" or null if valid.
   */
  validateRequired(row: UniversityCsvRow): string | null {
    const missing = REQUIRED_FIELDS.filter((field) => {
      const v = row[field];
      return v === undefined || v === null || String(v).trim() === '';
    });
    if (missing.length === 0) return null;
    return `missing required field(s): ${missing.join(', ')}`;
  }

  /**
   * Validates commission (number), commissionType, establishedYear and currRanking.
   * @returns Error message or null if valid.
   */
  validateFormat(row: UniversityCsvRow): string | null {
    const commissionRaw = row.commission.trim();
    const num = Number(commissionRaw);
    if (commissionRaw === '' || Number.isNaN(num)) {
      return 'commission must be a number';
    }
    const commissionType = row.commissionType.trim();
    if (!VALID_COMMISSION_TYPES.includes(commissionType as (typeof VALID_COMMISSION_TYPES)[number])) {
      return `commissionType must be ${VALID_COMMISSION_TYPES.join(' or ')}`;
    }

    const establishedYearRaw = row.establishedYear.trim();
    const establishedYearNum = Number(establishedYearRaw);
    if (establishedYearRaw === '' || Number.isNaN(establishedYearNum)) {
      return 'establishedYear must be a number';
    }

    const currRankingRaw = row.currRanking.trim();
    const currRankingNum = Number(currRankingRaw);
    if (currRankingRaw === '' || Number.isNaN(currRankingNum)) {
      return 'currRanking must be a number';
    }

    return null;
  }

  /**
   * Validates rankingMetaData and locationMapMetaData: valid JSON and expected shape.
   * @returns Error message or null if valid.
   */
  validateJsonMetaData(row: UniversityCsvRow): string | null {
    const rankingRaw = row.rankingMetaData.trim();
    let ranking: unknown;
    try {
      ranking = JSON.parse(rankingRaw);
    } catch {
      return 'rankingMetaData: invalid JSON';
    }
    if (!Array.isArray(ranking)) {
      return 'rankingMetaData: must be array of { subtitle?, description: string[] }';
    }
    for (let i = 0; i < ranking.length; i++) {
      const item = ranking[i];
      if (item === null || typeof item !== 'object' || Array.isArray(item)) {
        return 'rankingMetaData: must be array of { subtitle?, description: string[] }';
      }
      const desc = (item as Record<string, unknown>)['description'];
      if (!Array.isArray(desc) || desc.some((d) => typeof d !== 'string')) {
        return 'rankingMetaData: must be array of { subtitle?, description: string[] }';
      }
      const sub = (item as Record<string, unknown>)['subtitle'];
      if (sub !== undefined && sub !== null && typeof sub !== 'string') {
        return 'rankingMetaData: must be array of { subtitle?, description: string[] }';
      }
    }

    const locationRaw = row.locationMapMetaData.trim();
    let location: unknown;
    try {
      location = JSON.parse(locationRaw);
    } catch {
      return 'locationMapMetaData: invalid JSON';
    }
    if (
      location === null ||
      typeof location !== 'object' ||
      Array.isArray(location)
    ) {
      return 'locationMapMetaData: must be { href: string, text: string }';
    }
    const obj = location as Record<string, unknown>;
    if (typeof obj['href'] !== 'string' || typeof obj['text'] !== 'string') {
      return 'locationMapMetaData: must be { href: string, text: string }';
    }
    return null;
  }

  /**
   * Validates all rows: required fields first, then format. Invalid rows never reach DB.
   * @returns valid rows and invalid rows with errorReason.
   */
  validateRows(rows: UniversityCsvRow[]): {
    valid: UniversityCsvRow[];
    invalid: ErrorUniversityRow[];
  } {
    const valid: UniversityCsvRow[] = [];
    const invalid: ErrorUniversityRow[] = [];
    for (const row of rows) {
      const requiredError = this.validateRequired(row);
      if (requiredError) {
        invalid.push({ ...row, errorReason: requiredError });
        continue;
      }
      const formatError = this.validateFormat(row);
      if (formatError) {
        invalid.push({ ...row, errorReason: formatError });
        continue;
      }
      const jsonError = this.validateJsonMetaData(row);
      if (jsonError) {
        invalid.push({ ...row, errorReason: jsonError });
        continue;
      }
      valid.push(row);
    }
    return { valid, invalid };
  }
}
