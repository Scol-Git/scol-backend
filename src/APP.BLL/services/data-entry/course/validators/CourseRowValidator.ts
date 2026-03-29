import { Injectable } from '@nestjs/common';
import type { CsvRow } from '../../common/abstractions/CsvImportProcessor';
import { parseIntakeInfo } from '../parsers/courseIntakeInfoParser';
import {
  parseCourseDurationMonths,
  parseJsonValue,
  parseRequiredDecimal,
} from '../parsers/courseCsvFieldParsers';

export type CourseCsvRow = CsvRow;

export type ErrorCourseRow = CourseCsvRow & { errorReason: string };

const REQUIRED = [
  'uniName',
  'programmeName',
  'degreeName',
  'courseName',
  'minDegreeName',
  'minGpa',
  'intakeInfo',
] as const satisfies readonly string[];

@Injectable()
export class CourseRowValidator {
  validateRows(rows: CourseCsvRow[]): {
    valid: CourseCsvRow[];
    invalid: ErrorCourseRow[];
  } {
    const valid: CourseCsvRow[] = [];
    const invalid: ErrorCourseRow[] = [];
    for (const row of rows) {
      const err = this.validateRow(row);
      if (err) {
        invalid.push({ ...row, errorReason: err });
      } else {
        valid.push(row);
      }
    }
    return { valid, invalid };
  }

  private validateRow(row: CourseCsvRow): string | null {
    for (const key of REQUIRED) {
      const v = row[key as keyof CourseCsvRow];
      if (v === undefined || v === null || String(v).trim() === '') {
        return `missing required field(s): ${key}`;
      }
    }

    if (parseRequiredDecimal(row.minGpa) === null) {
      return 'minGpa must be a number';
    }

    const higherDeg = (row.higherDegreeName ?? '').trim();
    const higherGpaRaw = (row.higherGpa ?? '').trim();
    if (higherDeg && higherGpaRaw === '') {
      return 'higherGpa is required when higherDegreeName is set';
    }
    if (!higherDeg && higherGpaRaw !== '') {
      return 'higherDegreeName is required when higherGpa is set';
    }
    if (higherDeg && parseRequiredDecimal(row.higherGpa) === null) {
      return 'higherGpa must be a number when higherDegreeName is set';
    }

    const intake = parseIntakeInfo(row.intakeInfo);
    if (!intake) {
      return 'intakeInfo must be parseable (e.g. Sep-26 or Sep 2026)';
    }

    const durRaw = (row.courseDuration ?? '').trim();
    if (durRaw && parseCourseDurationMonths(row.courseDuration) === null) {
      return 'courseDuration must contain a number (months)';
    }

    const ar = (row.AcademicRequirementsMetaData ?? '').trim();
    if (ar && parseJsonValue(ar) === null) {
      return 'AcademicRequirementsMetaData: invalid JSON';
    }
    const im = (row.intakeMetaData ?? '').trim();
    if (im && parseJsonValue(im) === null) {
      return 'intakeMetaData: invalid JSON';
    }
    const fm = (row.feesMetaData ?? '').trim();
    if (fm && parseJsonValue(fm) === null) {
      return 'feesMetaData: invalid JSON';
    }
    const sm = (row.scholarshipMetaData ?? '').trim();
    if (sm && parseJsonValue(sm) === null) {
      return 'scholarshipMetaData: invalid JSON';
    }

    const engCols = [
      'ieltsMinOverall',
      'ieltsMinSection',
      'toeflMinOverall',
      'toeflMinSection',
      'pteMinOverall',
      'pteMinSection',
    ] as const;
    for (const c of engCols) {
      const x = (row[c] ?? '').trim();
      if (x !== '' && parseRequiredDecimal(x) === null) {
        return `${c} must be a number when set`;
      }
    }

    const feeCols = [
      'tuitionFee',
      'initialDeposit',
      'applicationFee',
      'scholarshipAmount',
    ] as const;
    for (const c of feeCols) {
      const x = (row[c] ?? '').trim();
      if (x !== '' && parseRequiredDecimal(x) === null) {
        return `${c} must be a number when set`;
      }
    }

    return null;
  }
}
