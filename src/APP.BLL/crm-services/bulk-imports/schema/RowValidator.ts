import { ImportErrorCode, type RowIssue } from '../common/ImportErrorCode';
import type { CsvRow } from '../common/CsvParser';
import type { ImportSchema } from './defineImportSchema';

/** Parsed values keyed by CSV header. null = empty cell. */
export type ParsedCells = Record<string, unknown>;

export interface CellValidationResult {
  values: ParsedCells;
  issues: RowIssue[];
}

export function cleanCell(raw: string | undefined): string | null {
  const v = (raw ?? '').replace(/ /g, ' ').trim();
  return v === '' ? null : v;
}

export function validateCells(schema: ImportSchema, row: CsvRow): CellValidationResult {
  const values: ParsedCells = {};
  const issues: RowIssue[] = [];
  for (const col of schema.columns) {
    const cell = cleanCell(row[col.header]);
    if (cell === null) {
      values[col.header] = null;
      if (col.required === 'import') {
        issues.push({
          severity: 'ERROR',
          code: ImportErrorCode.MISSING_REQUIRED_FIELD,
          column: col.header,
          message: `${col.header} is required`,
        });
      }
      if (col.required === 'publish') {
        issues.push({
          severity: 'WARNING',
          code: ImportErrorCode.MISSING_FOR_PUBLISH,
          column: col.header,
          message: `${col.header} is required before publishing`,
        });
      }
      continue;
    }
    const r = col.parse(cell);
    if (r.ok) {
      values[col.header] = r.value;
    } else {
      values[col.header] = null;
      issues.push({
        severity: 'ERROR',
        code: r.code,
        column: col.header,
        message: `${col.header}: ${r.message}`,
      });
    }
  }
  return { values, issues };
}

export const hasError = (issues: RowIssue[]): boolean =>
  issues.some((i) => i.severity === 'ERROR');
