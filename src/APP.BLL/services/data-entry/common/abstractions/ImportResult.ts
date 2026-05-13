/**
 * Result of a bulk import run: CSV buffers and row counts.
 */
export interface ImportResult {
  reviewedCsv: Buffer;
  errorsCsv: Buffer;
  reviewedCount: number;
  errorsCount: number;
}
