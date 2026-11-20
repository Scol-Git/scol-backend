import { parse } from 'csv-parse/sync';

export type CsvRow = Record<string, string>;
/** rows[i] is record number i + 2 (header = 1). */
export interface ParsedCsv {
  headers: string[];
  rows: CsvRow[];
}

export class InvalidEncodingError extends Error {}

/** Strict UTF-8 decode. Throws InvalidEncodingError if bytes are not valid UTF-8. */
export function decodeUtf8Strict(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(bytes)
      .replace(/^﻿/, '');
  } catch {
    throw new InvalidEncodingError('invalid utf-8');
  }
}

export function parseCsv(text: string): ParsedCsv {
  const records = parse(text, {
    bom: true,
    relax_column_count: true, // short rows are filled with '' below
    skip_empty_lines: true,
  }) as string[][];
  if (records.length === 0) return { headers: [], rows: [] };
  const headers = records[0].map((h) => h.replace(/ /g, ' ').trim());
  const rows = records.slice(1).map((cells) => {
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
  return { headers, rows };
}
