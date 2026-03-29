const MONTH_MAP: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  sep: 9,
  oct: 10,
  nov: 11,
  dec: 12,
};

/**
 * Parses intake strings such as `Sep-26`, `Sep 2026`, `Sep-2026`.
 * Two-digit years use 2000+year when year < 100.
 */
export function parseIntakeInfo(
  raw: string,
): { month: number; year: number } | null {
  const t = raw.trim();
  if (!t) return null;

  const m1 = t.match(/^([A-Za-z]{3})[-\s]+(\d{2}|\d{4})$/i);
  if (m1) {
    const mon = MONTH_MAP[m1[1].toLowerCase()];
    if (!mon) return null;
    const yStr = m1[2];
    let year: number;
    if (yStr.length === 4) {
      year = Number(yStr);
    } else {
      const yy = Number(yStr);
      year = yy < 100 ? 2000 + yy : yy;
    }
    if (Number.isNaN(year)) return null;
    return { month: mon, year };
  }

  return null;
}
