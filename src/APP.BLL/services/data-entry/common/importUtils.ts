import type { CsvImportSchema } from './abstractions/CsvImportSchema';
import type { ImportResult } from './abstractions/ImportResult';
import { buildCsvBuffer } from './engine/CsvWriter';

/** Maximum staging CSV file size for bulk import (course and university). */
export const MAX_CSV_IMPORT_BYTES = 200 * 1024 * 1024; // 200 MB

export function formatImportTimestamp(): string {
  return new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+/, '')
    .slice(0, 15);
}

export function emptyImportResult(schema: CsvImportSchema): ImportResult {
  return {
    reviewedCsv: buildCsvBuffer([], schema.reviewedHeaders),
    errorsCsv: buildCsvBuffer([], schema.errorHeaders),
    reviewedCount: 0,
    errorsCount: 0,
  };
}
