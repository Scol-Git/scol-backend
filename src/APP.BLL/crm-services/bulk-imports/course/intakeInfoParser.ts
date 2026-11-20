import { ImportErrorCode } from '../common/ImportErrorCode';
import type { ParseResult } from '../schema/parsers';

export interface ParsedIntake {
  month: number;
  year: number;
}

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
};

/** "September 2027", "Sep 2027", "Sep-27", "sep-2027" */
function parseToken(token: string): ParsedIntake | null {
  const m = token.match(/^([A-Za-z]+)[\s-]+(\d{2}|\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1].toLowerCase()];
  if (!month) return null;
  const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2]);
  return { month, year };
}

/**
 * Splits on , ; | and parses every token. ANY bad token makes the whole cell invalid.
 * Duplicates inside the cell are removed. Result is sorted by date.
 * Past intakes are NOT checked here (the handler checks them with the current date).
 */
export function parseIntakeList(raw: string): ParseResult<ParsedIntake[]> {
  const tokens = raw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) {
    return { ok: false, code: ImportErrorCode.INVALID_INTAKE, message: 'no intake given' };
  }
  const seen = new Map<number, ParsedIntake>();
  for (const t of tokens) {
    const p = parseToken(t);
    if (!p) {
      return {
        ok: false,
        code: ImportErrorCode.INVALID_INTAKE,
        message: `"${t}" is not a valid intake (use e.g. "September 2027" or "Sep-27")`,
      };
    }
    seen.set(p.year * 12 + p.month, p);
  }
  return {
    ok: true,
    value: [...seen.values()].sort(
      (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month),
    ),
  };
}

export const intakeKey = (i: ParsedIntake): number => i.year * 12 + i.month;
