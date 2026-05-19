import { Injectable } from '@nestjs/common';
import type { CsvRow } from '../../common/abstractions/CsvImportProcessor';
import type { CourseCsvRow, ErrorCourseRow } from '../dto/CourseImportRowTypes';
import { parseIntakeInfoList } from '../parsers/courseIntakeInfoParser';
import {
  parseCourseDurationMonths,
  parseRequiredDecimal,
} from '../parsers/courseCsvFieldParsers';
import {
  formatImportError,
  ImportErrorCode,
} from '../../common/abstractions/ImportErrorCode';
import { parseMetaDataItems } from '../../common/engine/MetaDataParser';

export type { CourseCsvRow, ErrorCourseRow };

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
        return formatImportError(
          ImportErrorCode.MISSING_REQUIRED_FIELD,
          `missing required field(s): ${key}`,
        );
      }
    }

    if (parseRequiredDecimal(row.minGpa) === null) {
      return formatImportError(
        ImportErrorCode.INVALID_FORMAT,
        'minGpa must be a number',
      );
    }

    const higherDeg = (row.higherDegreeName ?? '').trim();
    const higherGpaRaw = (row.higherGpa ?? '').trim();
    if (higherDeg && higherGpaRaw === '') {
      return formatImportError(
        ImportErrorCode.MISSING_REQUIRED_FIELD,
        'higherGpa is required when higherDegreeName is set',
      );
    }
    if (!higherDeg && higherGpaRaw !== '') {
      return formatImportError(
        ImportErrorCode.MISSING_REQUIRED_FIELD,
        'higherDegreeName is required when higherGpa is set',
      );
    }
    if (higherDeg && parseRequiredDecimal(row.higherGpa) === null) {
      return formatImportError(
        ImportErrorCode.INVALID_FORMAT,
        'higherGpa must be a number when higherDegreeName is set',
      );
    }

    const intakes = parseIntakeInfoList(row.intakeInfo);
    if (intakes.length === 0) {
      return formatImportError(
        ImportErrorCode.INVALID_FORMAT,
        'intakeInfo must be parseable (e.g. Sep-26, Dec-26 or Sep 2026)',
      );
    }

    const durRaw = (row.courseDuration ?? '').trim();
    if (durRaw && parseCourseDurationMonths(row.courseDuration) === null) {
      return formatImportError(
        ImportErrorCode.INVALID_FORMAT,
        'courseDuration must contain a number (months)',
      );
    }

    const ar = (row.AcademicRequirementsMetaData ?? '').trim();
    if (ar && !parseMetaDataItems(ar)) {
      return formatImportError(
        ImportErrorCode.INVALID_JSON,
        'AcademicRequirementsMetaData must be MetaDataItem[]',
      );
    }
    const fm = (row.feesMetaData ?? '').trim();
    if (fm && !parseMetaDataItems(fm)) {
      return formatImportError(
        ImportErrorCode.INVALID_JSON,
        'feesMetaData must be MetaDataItem[]',
      );
    }
    const sm = (row.scholarshipMetaData ?? '').trim();
    if (sm && !parseMetaDataItems(sm)) {
      return formatImportError(
        ImportErrorCode.INVALID_JSON,
        'scholarshipMetaData must be MetaDataItem[]',
      );
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
        return formatImportError(
          ImportErrorCode.INVALID_FORMAT,
          `${c} must be a number when set`,
        );
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
        return formatImportError(
          ImportErrorCode.INVALID_FORMAT,
          `${c} must be a number when set`,
        );
      }
    }

    return null;
  }
}
