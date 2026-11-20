export enum ImportErrorCode {
  // errors (row not imported)
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT = 'INVALID_FORMAT',
  INVALID_JSON = 'INVALID_JSON',
  UNKNOWN_DEGREE = 'UNKNOWN_DEGREE',
  UNKNOWN_ENGLISH_TEST = 'UNKNOWN_ENGLISH_TEST',
  UNIVERSITY_NOT_FOUND = 'UNIVERSITY_NOT_FOUND',
  INVALID_INTAKE = 'INVALID_INTAKE',
  INTAKE_IN_PAST = 'INTAKE_IN_PAST',
  DUPLICATE_ROW = 'DUPLICATE_ROW',
  UNEXPECTED_ERROR = 'UNEXPECTED_ERROR',
  // warnings (row still imported)
  MISSING_FOR_PUBLISH = 'MISSING_FOR_PUBLISH',
  ALREADY_PUBLISHED = 'ALREADY_PUBLISHED',
  PUBLISHED_DIFFERS = 'PUBLISHED_DIFFERS',
  IGNORED_COLUMN = 'IGNORED_COLUMN',
}

export type IssueSeverity = 'ERROR' | 'WARNING';

export interface RowIssue {
  severity: IssueSeverity;
  code: ImportErrorCode;
  /** CSV header, when the issue is about one cell. */
  column?: string;
  /** Human readable, English, no stack traces. */
  message: string;
}

/** File-level failure texts (batch becomes FAILED with this failureReason). */
export const FAILURE_REASON = {
  INVALID_ENCODING: 'File is not valid UTF-8. In Excel use "Save As → CSV UTF-8".',
  missingColumns: (headers: string[]) => `Missing required columns: ${headers.join(', ')}.`,
  tooManyRows: (n: number, max: number) => `File has ${n} records; the maximum is ${max}.`,
  EMPTY_FILE: 'File is empty.',
  FILE_NOT_FOUND: 'Uploaded file not found in storage.',
  UPLOAD_TIMEOUT: 'Upload not completed within 24 hours.',
  UNEXPECTED: 'Processing failed unexpectedly. Please try again or contact support.',
} as const;
