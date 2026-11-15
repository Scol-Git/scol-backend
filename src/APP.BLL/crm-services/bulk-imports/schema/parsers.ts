import type { MetaDataItem } from '@shared/types/MetaDataItem.type';
import { ImportErrorCode } from '../common/ImportErrorCode';
import { parseMetaDataItems } from '../common/MetaDataParser';
import { parseIntakeList, type ParsedIntake } from '../course/intakeInfoParser';

export type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: ImportErrorCode; message: string };
/** raw is already trimmed, \xa0-normalised and NON-EMPTY. */
export type CellParser<T> = (raw: string) => ParseResult<T>;

export const ok = <T>(value: T): ParseResult<T> => ({ ok: true, value });
export const fail = (code: ImportErrorCode, message: string): ParseResult<never> => ({
  ok: false,
  code,
  message,
});

const PLAIN_NUMBER = /^-?\d+(\.\d+)?$/;
const PLAIN_INT = /^-?\d+$/;

export const text =
  (o: { max?: number } = {}): CellParser<string> =>
  (raw) =>
    o.max != null && raw.length > o.max
      ? fail(ImportErrorCode.INVALID_FORMAT, `must be at most ${o.max} characters`)
      : ok(raw);

/** Returns the number as a string (DB decimal columns are strings in TypeORM). */
export const decimal =
  (o: { min?: number; max?: number } = {}): CellParser<string> =>
  (raw) => {
    if (!PLAIN_NUMBER.test(raw)) {
      return fail(
        ImportErrorCode.INVALID_FORMAT,
        `"${raw}" is not a plain number (no commas, currency symbols or spaces)`,
      );
    }
    const n = Number(raw);
    if (o.min != null && n < o.min) return fail(ImportErrorCode.INVALID_FORMAT, `must be ≥ ${o.min}`);
    if (o.max != null && n > o.max) return fail(ImportErrorCode.INVALID_FORMAT, `must be ≤ ${o.max}`);
    return ok(raw);
  };

export const int =
  (o: { min?: number; max?: number } = {}): CellParser<number> =>
  (raw) => {
    if (!PLAIN_INT.test(raw)) return fail(ImportErrorCode.INVALID_FORMAT, `"${raw}" is not a whole number`);
    const n = Number(raw);
    if (o.min != null && n < o.min) return fail(ImportErrorCode.INVALID_FORMAT, `must be ≥ ${o.min}`);
    if (o.max != null && n > o.max) return fail(ImportErrorCode.INVALID_FORMAT, `must be ≤ ${o.max}`);
    return ok(n);
  };

export const enumUpper =
  <E extends Record<string, string>>(e: E): CellParser<E[keyof E]> =>
  (raw) => {
    const v = raw.toUpperCase();
    const values = Object.values(e);
    return values.includes(v)
      ? ok(v as E[keyof E])
      : fail(ImportErrorCode.INVALID_FORMAT, `must be one of ${values.join(', ')} (case-insensitive)`);
  };

export const url =
  (o: { max?: number } = { max: 2048 }): CellParser<string> =>
  (raw) => {
    if (o.max != null && raw.length > o.max) {
      return fail(ImportErrorCode.INVALID_FORMAT, `URL longer than ${o.max} characters`);
    }
    try {
      const u = new URL(raw);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        return fail(ImportErrorCode.INVALID_FORMAT, 'URL must start with http:// or https://');
      }
      return ok(raw);
    } catch {
      return fail(ImportErrorCode.INVALID_FORMAT, `"${raw}" is not a valid URL`);
    }
  };

/** Cell format: "url1", "url2"  -> string[] */
export const quotedUrlList = (): CellParser<string[]> => (raw) => {
  let list: unknown;
  try {
    list = JSON.parse(`[${raw}]`);
  } catch {
    return fail(ImportErrorCode.INVALID_JSON, 'expected a list like "https://a", "https://b"');
  }
  if (!Array.isArray(list) || !list.every((x) => typeof x === 'string')) {
    return fail(ImportErrorCode.INVALID_JSON, 'every item must be a quoted URL');
  }
  for (const item of list as string[]) {
    const r = url()(item.trim());
    if (!r.ok) return r;
    if (item.includes(',')) {
      return fail(ImportErrorCode.INVALID_FORMAT, 'URLs in campusLifeLinks must not contain commas');
    }
  }
  return ok((list as string[]).map((s) => s.trim()));
};

export const metaDataItems = (): CellParser<MetaDataItem[]> => (raw) => {
  const items = parseMetaDataItems(raw);
  return items
    ? ok(items)
    : fail(ImportErrorCode.INVALID_JSON, 'expected JSON like [{"subtitle":"...","description":["..."]}]');
};

/** Accepts a plain URL, a JSON string "https://...", or a JSON object {"href": "...", ...}. Stored as the original text. */
export const locationMap = (): CellParser<string> => (raw) => {
  if (raw.startsWith('{') || raw.startsWith('"')) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      const href =
        typeof parsed === 'string' ? parsed : (parsed as { href?: unknown })?.href;
      if (typeof href !== 'string' || !url()(href).ok) {
        return fail(ImportErrorCode.INVALID_JSON, 'locationMapMetaData must contain a valid "href" URL');
      }
      return ok(raw);
    } catch {
      return fail(ImportErrorCode.INVALID_JSON, 'locationMapMetaData is not valid JSON');
    }
  }
  return url()(raw);
};

export const isoDate = (): CellParser<string> => (raw) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return fail(ImportErrorCode.INVALID_FORMAT, 'date must be YYYY-MM-DD');
  }
  const d = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== raw
    ? fail(ImportErrorCode.INVALID_FORMAT, `"${raw}" is not a real date`)
    : ok(raw);
};

export const currencyCode = (): CellParser<string> => (raw) =>
  /^[A-Za-z]{3}$/.test(raw)
    ? ok(raw.toUpperCase())
    : fail(ImportErrorCode.INVALID_FORMAT, 'currency must be a 3-letter ISO code like GBP');

export const intakeList = (): CellParser<ParsedIntake[]> => (raw) => parseIntakeList(raw);
