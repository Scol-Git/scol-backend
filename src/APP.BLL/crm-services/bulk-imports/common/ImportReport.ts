import { buildCsv } from './CsvWriter';
import type { CsvRow } from './CsvParser';
import type { ChunkOutcome } from './BulkImportHandler';
import { ImportErrorCode, type RowIssue } from './ImportErrorCode';

export const REPORT_EXTRA_HEADERS = ['rowNumber', 'severity', 'errorCode', 'errorMessage'] as const;

interface RowEntry {
  raw: CsvRow;
  issues: RowIssue[];
}

/** Collects per-row issues and counters, and renders errors.csv. */
export class ImportReport {
  created = 0;
  updated = 0;
  skipped = 0;
  private readonly rows = new Map<number, RowEntry>();
  private ignoredColumns: string[] = [];

  constructor(
    private readonly headers: string[],
    private readonly rawRows: CsvRow[],
  ) {}

  /** Record number -> source row (header = record 1). */
  private rawOf(rowNumber: number): CsvRow {
    return this.rawRows[rowNumber - 2] ?? {};
  }

  addIgnoredColumns(columns: string[]): void {
    this.ignoredColumns = columns;
  }

  addIssues(rowNumber: number, issues: RowIssue[]): void {
    if (issues.length === 0) return;
    const entry = this.rows.get(rowNumber) ?? { raw: this.rawOf(rowNumber), issues: [] };
    entry.issues.push(...issues);
    this.rows.set(rowNumber, entry);
  }

  addError(rowNumber: number, code: ImportErrorCode, message: string): void {
    this.addIssues(rowNumber, [{ severity: 'ERROR', code, message }]);
  }

  addOutcome(outcome: ChunkOutcome): void {
    this.created += outcome.created;
    this.updated += outcome.updated;
    this.skipped += outcome.skipped;
    for (const [rowNumber, issues] of outcome.issuesByRow) this.addIssues(rowNumber, issues);
  }

  /** Number of rows with at least one ERROR. */
  get errorCount(): number {
    let n = 0;
    for (const e of this.rows.values()) if (e.issues.some((i) => i.severity === 'ERROR')) n++;
    return n;
  }

  /** Number of rows with warnings and no error. */
  get warningCount(): number {
    let n = 0;
    for (const e of this.rows.values()) {
      const hasErr = e.issues.some((i) => i.severity === 'ERROR');
      if (!hasErr && e.issues.some((i) => i.severity === 'WARNING')) n++;
    }
    return n;
  }

  get hasIssues(): boolean {
    return this.rows.size > 0 || this.ignoredColumns.length > 0;
  }

  buildErrorsCsv(): Buffer {
    const headers = [...this.headers, ...REPORT_EXTRA_HEADERS];
    const lines: Array<Record<string, string | number>> = [];

    if (this.ignoredColumns.length > 0) {
      lines.push({
        rowNumber: 1,
        severity: 'WARNING',
        errorCode: ImportErrorCode.IGNORED_COLUMN,
        errorMessage: `Ignored columns: ${this.ignoredColumns.join(', ')}`,
      });
    }

    for (const rowNumber of [...this.rows.keys()].sort((a, b) => a - b)) {
      const { raw, issues } = this.rows.get(rowNumber) as RowEntry;
      const severity = issues.some((i) => i.severity === 'ERROR') ? 'ERROR' : 'WARNING';
      const ofSeverity = issues.filter((i) => i.severity === severity);
      lines.push({
        ...raw,
        rowNumber,
        severity,
        errorCode: ofSeverity[0].code,
        errorMessage: issues.map((i) => i.message).join(' | '),
      });
    }
    return buildCsv(headers, lines);
  }
}
