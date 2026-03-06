import { EntityManager } from 'typeorm';

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
 * Processor that performs DB resolution and persistence for a specific CSV import type.
 * Runs inside a transaction; receives raw CSV rows and returns reviewed + error rows.
 */
export interface CsvImportProcessor {
  processRows(manager: EntityManager, rows: CsvRow[]): Promise<CsvProcessingResult>;
}
