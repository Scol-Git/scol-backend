// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse } = require('csv-parse/sync') as { parse: (input: string, options: object) => Record<string, string>[] };
import type { CsvRecord } from '../abstractions/ICsvImportProcessor';

/**
 * Parses CSV text into an array of row objects (keys = header names).
 */
export function parseCsv(csvText: string): CsvRecord[] {
  const normalized = csvText.replace(/^\uFEFF/, '');
  return parse(normalized, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    bom: true,
  }) as CsvRecord[];
}
