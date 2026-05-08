import { Injectable } from '@nestjs/common';
import { CommissionType } from '@shared/enums/CommissionType.enum';
import type {
  UniversityCsvRow,
  ErrorUniversityRow,
  ValidatedUniversityCsvRow,
} from '../dto/UniversityCsvRow';
import { parseMetaDataItems } from '../../common/engine/MetaDataParser';
import {
  formatImportError,
  ImportErrorCode,
} from '../../common/abstractions/ImportErrorCode';

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

/**
 * Normalizes `locationMapMetaData` CSV cell to a URL string.
 * Supports: plain URL, JSON `{"href":"..."}` (legacy), or JSON-encoded string `"https://..."`.
 */
function parseLocationMapUrlFromCell(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).href;
  } catch {
    /* fall through */
  }
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (typeof parsed === 'string') {
      try {
        return new URL(parsed.trim()).href;
      } catch {
        return null;
      }
    }
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const href = (parsed as { href?: unknown }).href;
      if (typeof href === 'string' && href.trim()) {
        try {
          return new URL(href.trim()).href;
        } catch {
          return null;
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}

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
    return formatImportError(
      ImportErrorCode.MISSING_REQUIRED_FIELD,
      `missing required field(s): ${missing.join(', ')}`,
    );
  }

  /**
   * Validates commission (number), commissionType, establishedYear and currRanking.
   * @returns Error message or null if valid.
   */
  validateFormat(row: UniversityCsvRow): string | null {
    const commissionRaw = row.commission.trim();
    const num = Number(commissionRaw);
    if (commissionRaw === '' || Number.isNaN(num)) {
      return formatImportError(
        ImportErrorCode.INVALID_FORMAT,
        'commission must be a number',
      );
    }
    const commissionType = row.commissionType.trim();
    if (!VALID_COMMISSION_TYPES.includes(commissionType as (typeof VALID_COMMISSION_TYPES)[number])) {
      return formatImportError(
        ImportErrorCode.INVALID_FORMAT,
        `commissionType must be ${VALID_COMMISSION_TYPES.join(' or ')}`,
      );
    }

    const establishedYearRaw = row.establishedYear.trim();
    const establishedYearNum = Number(establishedYearRaw);
    if (establishedYearRaw === '' || Number.isNaN(establishedYearNum)) {
      return formatImportError(
        ImportErrorCode.INVALID_FORMAT,
        'establishedYear must be a number',
      );
    }

    const currRankingRaw = row.currRanking.trim();
    const currRankingNum = Number(currRankingRaw);
    if (currRankingRaw === '' || Number.isNaN(currRankingNum)) {
      return formatImportError(
        ImportErrorCode.INVALID_FORMAT,
        'currRanking must be a number',
      );
    }

    return null;
  }

  /**
   * Validates rankingMetaData and locationMapMetaData: valid JSON and expected shape.
   * @returns Error message or null if valid.
   */
  parseValidatedJson(row: UniversityCsvRow): {
    rankingMetaDataItems: ValidatedUniversityCsvRow['rankingMetaDataItems'];
    locationMapUrl: string;
  } | null {
    const rankingRaw = row.rankingMetaData.trim();
    const rankingMetaDataItems = parseMetaDataItems(rankingRaw);
    if (!rankingMetaDataItems) return null;

    const locationMapUrl = parseLocationMapUrlFromCell(row.locationMapMetaData);
    if (!locationMapUrl) return null;
    return { rankingMetaDataItems, locationMapUrl };
  }

  /**
   * Validates all rows: required fields first, then format. Invalid rows never reach DB.
   * @returns valid rows and invalid rows with errorReason.
   */
  validateRows(rows: UniversityCsvRow[]): {
    valid: ValidatedUniversityCsvRow[];
    invalid: ErrorUniversityRow[];
  } {
    const valid: ValidatedUniversityCsvRow[] = [];
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
      const parsed = this.parseValidatedJson(row);
      if (!parsed) {
        invalid.push({
          ...row,
          errorReason: formatImportError(
            ImportErrorCode.INVALID_JSON,
            'rankingMetaData must be MetaDataItem[] and locationMapMetaData must be a URL or legacy {"href":"..."} JSON',
          ),
        });
        continue;
      }
      valid.push({
        ...row,
        rankingMetaDataItems: parsed.rankingMetaDataItems,
        locationMapUrl: parsed.locationMapUrl,
      });
    }
    return { valid, invalid };
  }
}
