/** Name normalisation for ALL lookups and natural keys (matches SQL lower(trim(col))). */
export const normName = (s: string): string =>
  s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Store names with inner whitespace collapsed so SQL lower(trim()) agrees with normName. */
export const cleanName = (s: string): string => s.replace(/\s+/g, ' ').trim();
