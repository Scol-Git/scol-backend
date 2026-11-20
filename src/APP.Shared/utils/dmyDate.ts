const DMY = /^(\d{2})-(\d{2})-(\d{4})$/;

/** True when the string is a real calendar date in DD-MM-YYYY. */
export function isDmyDate(raw: string): boolean {
  const match = DMY.exec(raw);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** DD-MM-YYYY to YYYY-MM-DD. Returns null when the value is not a real date. */
export function dmyToIso(raw: string): string | null {
  if (!isDmyDate(raw)) return null;
  const [day, month, year] = raw.split('-');
  return `${year}-${month}-${day}`;
}

/** Database date (YYYY-MM-DD string or Date) to DD-MM-YYYY. */
export function isoToDmy(value: Date | string | null | undefined): string | null {
  if (value == null) return null;
  const iso =
    typeof value === 'string'
      ? value.slice(0, 10)
      : Number.isNaN(value.getTime())
        ? ''
        : value.toISOString().slice(0, 10);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}
