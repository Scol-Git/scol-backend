import { EntityManager } from 'typeorm';

/**
 * Single row as parsed from CSV (string values keyed by column name).
 */
export type CsvRecord = Record<string, string>;

/**
 * Result of processing: reviewed rows (with resolved IDs) and error rows (with errorReason).
 */
export interface CsvProcessingResult {
  reviewedRows: (CsvRecord & { sysCountryId: string; sysStateId: string; sysCityId: string; id: string })[];
  errorRows: (CsvRecord & { errorReason: string })[];
}

/**
 * Processor that performs DB resolution and persistence for a specific CSV import type.
 * Runs inside a transaction; receives raw CSV rows and returns reviewed + error rows.
 */
export interface ICsvImportProcessor {
  /**
   * Resolve entities (e.g. countries, states, cities, universities) and persist.
   * Fills reviewedRows and errorRows according to validation and dedupe rules.
   */
  processRows(manager: EntityManager, rows: CsvRecord[]): Promise<CsvProcessingResult>;
}
