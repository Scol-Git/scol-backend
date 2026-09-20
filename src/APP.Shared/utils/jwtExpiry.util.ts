const EXPIRY_PATTERN = /^(\d+)(s|m|h|d)$/i;

/**
 * Parse JWT-style expiry string (e.g. 10m, 1h, 7d) to milliseconds.
 */
export function parseJwtExpiryToMs(expiresIn: string): number {
  const m = expiresIn.trim().match(EXPIRY_PATTERN);
  if (!m) {
    throw new Error(`Invalid JWT expiry format: ${expiresIn}`);
  }
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return n * multipliers[unit];
}

/**
 * Parse JWT-style expiry string to seconds.
 */
export function parseJwtExpiryToSeconds(expiresIn: string): number {
  return Math.floor(parseJwtExpiryToMs(expiresIn) / 1000);
}

/**
 * Validate JWT expiry format at startup.
 */
export function assertValidJwtExpiry(expiresIn: string, label: string): void {
  if (!EXPIRY_PATTERN.test(expiresIn.trim())) {
    throw new Error(
      `${label} must match format like 10m, 1h, or 7d (got: ${expiresIn})`,
    );
  }
}
