/**
 * Parses course duration: `36`, `36 months`, ` 48 ` → integer months or null if invalid.
 */
export function parseCourseDurationMonths(raw: string): number | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isNaN(n) ? null : n;
}

/** Parses decimal fields for DB string columns (TypeORM decimal as string). */
export function parseOptionalDecimal(raw: string): string | undefined {
  const t = raw.trim().replace(/,/g, '');
  if (!t) return undefined;
  const n = Number(t);
  if (!Number.isFinite(n)) return undefined;
  return String(n);
}

export function parseRequiredDecimal(raw: string): number | null {
  const t = raw.trim().replace(/,/g, '');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** ISO date `YYYY-MM-DD` or empty. */
export function parseOptionalDate(raw: string): Date | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return undefined;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const d = new Date(t + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return undefined;
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() + 1 !== month ||
    d.getUTCDate() !== day
  ) {
    return undefined;
  }
  return d;
}
