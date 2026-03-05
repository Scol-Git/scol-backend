import type { CsvRecord } from '../abstractions/CsvImportProcessor.interface';

function escapeCsvValue(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Build a CSV buffer from rows using the exact header order.
 * Does not use Object.keys; headers define column order.
 */
export function buildCsvBuffer(rows: Record<string, string>[], headers: string[]): Buffer {
  if (rows.length === 0) {
    return Buffer.from(headers.join(',') + '\n', 'utf-8');
  }
  const lines: string[] = [headers.join(',')];
  for (const row of rows) {
    const values = headers.map((header) => escapeCsvValue(String(row[header] ?? '')));
    lines.push(values.join(','));
  }
  return Buffer.from(lines.join('\n') + '\n', 'utf-8');
}
