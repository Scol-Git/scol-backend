/**
 * Schema for a CSV bulk import: required input columns and output column order.
 */
export interface CsvImportSchema {
  /** CSV must contain all these headers; extra columns allowed. */
  inputHeaders: string[];
  /** Exact column order for the reviewed output CSV. */
  reviewedHeaders: string[];
  /** Exact column order for the errors output CSV. */
  errorHeaders: string[];
}
