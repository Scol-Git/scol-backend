import type { EntityManager } from 'typeorm';

/**
 * Single row as parsed from CSV (string values keyed by column name).
 */
export type CsvRow = Record<string, string>;

/**
 * Result of processing: reviewed rows (with resolved IDs) and error rows (with errorReason).
 * Pipeline uses schema headers to write CSV; row shape is processor-specific.
 */
export interface CsvProcessingResult {
  reviewedRows: Array<Record<string, string>>;
  errorRows: (Record<string, string> & { errorReason: string })[];
}

/**
 * Object with {@link processRows} — used by {@link CsvImportPipeline} without a nominal interface.
 */
export type CsvImportRowProcessor = {
  processRows(
    manager: EntityManager,
    rows: CsvRow[],
  ): Promise<CsvProcessingResult>;
};
