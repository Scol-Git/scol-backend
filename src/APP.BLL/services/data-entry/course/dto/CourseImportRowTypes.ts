import type { CsvRow } from '../../common/abstractions/CsvImportProcessor';

/** Normalized course CSV row (same shape as pipeline `CsvRow`). */
export type CourseCsvRow = CsvRow;

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
