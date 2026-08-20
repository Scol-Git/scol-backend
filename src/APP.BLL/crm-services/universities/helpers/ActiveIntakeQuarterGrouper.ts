import type { ActiveIntakeItemDto } from '@shared/dtos/crm/universities/CrmUniversityDetailsResponseDto';

export type IntakeMonthYear = {
  intakeYear: number;
  intakeMonth: number;
};

/**
 * Groups active intake month/year rows into year-quarter buckets with
 * earliest/latest month in each bucket.
 */
export function groupActiveIntakesByQuarter(
  rows: IntakeMonthYear[],
): ActiveIntakeItemDto[] {
  const buckets = new Map<string, ActiveIntakeItemDto>();

  for (const row of rows) {
    const quarterNumber = Math.ceil(row.intakeMonth / 3);
    const quarter = `Q${quarterNumber}`;
    const key = `${row.intakeYear}-${quarter}`;

    const existing = buckets.get(key);
    if (!existing) {
      buckets.set(key, {
        intakeYear: row.intakeYear,
        quarter,
        intakeMonthFrom: row.intakeMonth,
        intakeMonthTo: row.intakeMonth,
      });
      continue;
    }

    existing.intakeMonthFrom = Math.min(
      existing.intakeMonthFrom,
      row.intakeMonth,
    );
    existing.intakeMonthTo = Math.max(existing.intakeMonthTo, row.intakeMonth);
  }

  return [...buckets.values()].sort((a, b) => {
    if (a.intakeYear !== b.intakeYear) return a.intakeYear - b.intakeYear;
    return a.quarter.localeCompare(b.quarter);
  });
}
