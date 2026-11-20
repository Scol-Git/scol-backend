import type { EntityManager } from 'typeorm';
import type { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import type { ImportSchema } from '../schema/defineImportSchema';
import type { ParsedCells } from '../schema/RowValidator';
import type { RowIssue } from './ImportErrorCode';
import type { CsvRow } from './CsvParser';

/** rowNumber = record number, header = 1. */
export interface SourceRow {
  rowNumber: number;
  raw: CsvRow;
}

/** A row that passed Phase 0. `values` are parsed cells keyed by header. */
export interface ValidRow {
  rowNumber: number;
  raw: CsvRow;
  values: ParsedCells;
  /** Warnings only. */
  issues: RowIssue[];
}

export interface RowValidation {
  valid?: ValidRow;
  issues: RowIssue[];
}

export interface ChunkOutcome {
  created: number;
  updated: number;
  skipped: number;
  /** Extra issues discovered while writing (ALREADY_PUBLISHED, PUBLISHED_DIFFERS, ...) keyed by rowNumber. */
  issuesByRow: Map<number, RowIssue[]>;
  /** Rows that turned out to be errors while writing; they are NOT counted above. */
  failedRows: Set<number>;
}

export interface BulkImportHandler<Ctx> {
  readonly type: BulkImportType;
  readonly schema: ImportSchema;
  /** Phase 0 - pure. Uses validateCells() + type-specific cross-column checks. */
  validate(row: SourceRow, now: Date): RowValidation;
  /** Phase 0 - pure. Natural key used to detect duplicates within the file. */
  naturalKey(row: ValidRow): string;
  /** Phase 1 - one query per lookup table; never one query per row. */
  prefetch(rows: ValidRow[], em: EntityManager): Promise<Ctx>;
  /** Phase 1 - resolve lookups; returns lookup errors per row (strict not found). Pure (uses ctx). */
  resolve(rows: ValidRow[], ctx: Ctx): Map<number, RowIssue[]>;
  /** Phase 2 - create all missing orDraft parents for the whole file. */
  createParents(rows: ValidRow[], ctx: Ctx, em: EntityManager, batchId: string): Promise<void>;
  /** Phase 3 - write one chunk with set-based SQL. Called inside a transaction. */
  writeChunk(rows: ValidRow[], ctx: Ctx, em: EntityManager, batchId: string): Promise<ChunkOutcome>;
}

export const emptyOutcome = (): ChunkOutcome => ({
  created: 0,
  updated: 0,
  skipped: 0,
  issuesByRow: new Map(),
  failedRows: new Set(),
});

export function addRowIssue(outcome: ChunkOutcome, rowNumber: number, issue: RowIssue): void {
  const list = outcome.issuesByRow.get(rowNumber) ?? [];
  list.push(issue);
  outcome.issuesByRow.set(rowNumber, list);
}
