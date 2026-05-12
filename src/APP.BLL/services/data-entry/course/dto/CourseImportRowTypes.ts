import type { CsvRow } from '../../common/abstractions/CsvImportProcessor';
import { CourseImportSchema } from '../CourseImportSchema';

/** Normalized course CSV row (same shape as pipeline `CsvRow`). */
export type CourseCsvRow = CsvRow;

/**
 * Trims known input columns to match {@link CourseImportSchema.inputHeaders}.
 */
export function normalizeCourseCsvRow(row: CsvRow): CourseCsvRow {
  const out: Record<string, string> = {};
  for (const key of CourseImportSchema.inputHeaders) {
    const v = row[key];
    out[key] = typeof v === 'string' ? v.trim() : '';
  }
  return out as CourseCsvRow;
}

/** Row that failed validation or catalog resolution (after valid rows pass format checks). */
export type ErrorCourseRow = CourseCsvRow & { errorReason: string };

/** Resolved IDs appended to reviewed CSV output (audit / joins). */
export interface CourseReviewedIdFields {
  uniId: string;
  sysProgrammeId: string;
  sysDegreeId: string;
  minSysDegreeId: string;
  higherSysDegreeId: string;
  uniCourseId: string;
  courseIntakeId: string;
  sysEngTestIdIelts: string;
  courseEngReqIdIelts: string;
  sysEngTestIdToefl: string;
  courseEngReqIdToefl: string;
  sysEngTestIdPte: string;
  courseEngReqIdPte: string;
  scholarshipId: string;
}
