import { ApplicationStage } from '@shared/enums/ApplicationStage.enum';
import {
  CrmDashboardApplicationIntakeStatisticsDto,
} from '@shared/dtos/crm/dashboard/CrmDashboardResponseDto';

export type IntakeQuarterBucket = {
  intakeYear: number;
  quarter: 1 | 2 | 3 | 4;
  startMonth: number;
  endMonth: number;
};

export type DashboardDateRange = {
  startDate: string;
  endDate: string;
};

export type IntakeStageCountField =
  keyof Omit<CrmDashboardApplicationIntakeStatisticsDto, 'intakeYear' | 'quarter'>;

export const INTAKE_STAGE_TO_FIELD: Record<string, IntakeStageCountField> = {
  [ApplicationStage.Submitted]: 'submitted',
  [ApplicationStage.Conditional]: 'conditionalOffer',
  [ApplicationStage.Unconditional]: 'unconditionalOffer',
  [ApplicationStage.Interview]: 'interview',
  [ApplicationStage.Payment]: 'payment',
  [ApplicationStage.CasCoe]: 'casOrCoeOrI20',
  [ApplicationStage.Visa]: 'visa',
};

export function getDefaultDashboardDateRange(): DashboardDateRange {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-${month}-${day}`,
  };
}

export function parseIsoDateParts(dateStr: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = dateStr.split('-').map(Number);
  return { year, month, day };
}

export function getQuarterFromMonth(month: number): 1 | 2 | 3 | 4 {
  if (month <= 3) {
    return 1;
  }

  if (month <= 6) {
    return 2;
  }

  if (month <= 9) {
    return 3;
  }

  return 4;
}

export function floorMonthToQuarterStart(month: number): number {
  return (getQuarterFromMonth(month) - 1) * 3 + 1;
}

export function ceilMonthToQuarterEnd(month: number): number {
  return getQuarterFromMonth(month) * 3;
}

export function generateIntakeQuarterBuckets(
  startDate: string,
  endDate: string,
): IntakeQuarterBucket[] {
  const start = parseIsoDateParts(startDate);
  const end = parseIsoDateParts(endDate);

  const startQuarter = getQuarterFromMonth(floorMonthToQuarterStart(start.month));
  const endQuarter = getQuarterFromMonth(ceilMonthToQuarterEnd(end.month));

  const buckets: IntakeQuarterBucket[] = [];
  let year = start.year;
  let quarter = startQuarter;

  while (year < end.year || (year === end.year && quarter <= endQuarter)) {
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;
    buckets.push({
      intakeYear: year,
      quarter,
      startMonth,
      endMonth,
    });

    quarter++;
    if (quarter > 4) {
      quarter = 1;
      year++;
    }
  }

  return buckets;
}

export function getIntakeKeyRange(startDate: string, endDate: string): {
  startKey: number;
  endKey: number;
} {
  const start = parseIsoDateParts(startDate);
  const end = parseIsoDateParts(endDate);

  return {
    startKey: start.year * 12 + floorMonthToQuarterStart(start.month),
    endKey: end.year * 12 + ceilMonthToQuarterEnd(end.month),
  };
}

export function createEmptyIntakeStatistics(
  bucket: IntakeQuarterBucket,
): CrmDashboardApplicationIntakeStatisticsDto {
  return {
    intakeYear: bucket.intakeYear,
    quarter: bucket.quarter,
    submitted: 0,
    conditionalOffer: 0,
    unconditionalOffer: 0,
    interview: 0,
    payment: 0,
    casOrCoeOrI20: 0,
    visa: 0,
  };
}

export function calculatePercentage(count: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((count / total) * 10000) / 100;
}

export function toCount(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function resolveDashboardDateRange(
  startDate?: string,
  endDate?: string,
): DashboardDateRange {
  const defaults = getDefaultDashboardDateRange();
  const resolvedStartDate = startDate ?? defaults.startDate;
  const resolvedEndDate = endDate ?? defaults.endDate;

  if (resolvedStartDate > resolvedEndDate) {
    throw new Error('startDate must be on or before endDate');
  }

  return {
    startDate: resolvedStartDate,
    endDate: resolvedEndDate,
  };
}
