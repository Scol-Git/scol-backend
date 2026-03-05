/**
 * Result of a bulk import run: CSV buffers and row counts.
 * Return type of {@link CsvImportExecutor.execute} and {@link UniversityCsvImportOrchestrator.execute}.
 */
export interface ImportResult {
  reviewedCsv: Buffer;
  errorsCsv: Buffer;
  reviewedCount: number;
  errorsCount: number;
}
