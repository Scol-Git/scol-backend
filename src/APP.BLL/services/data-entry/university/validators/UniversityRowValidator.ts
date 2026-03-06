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
   * Validates commission (number) and commissionType (AMOUNT or PERCENTAGE).
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
      valid.push(row);
    }
    return { valid, invalid };
  }
}
