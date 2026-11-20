function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** CSV with CRLF line endings and a UTF-8 BOM so Excel opens it correctly. */
export function buildCsv(
  headers: string[],
  rows: Array<Record<string, string | number | null | undefined>>,
): Buffer {
  const lines = [headers.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(String(row[h] ?? ''))).join(','));
  }
  return Buffer.from('﻿' + lines.join('\r\n') + '\r\n', 'utf8');
}
