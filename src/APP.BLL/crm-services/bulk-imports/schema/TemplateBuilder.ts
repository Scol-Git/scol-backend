import { buildCsv } from '../common/CsvWriter';
import type { ImportSchema } from './defineImportSchema';

/** Header row + one example row, generated from the schema. */
export function buildTemplate(schema: ImportSchema): Buffer {
  const headers = schema.columns.map((c) => c.header);
  const example: Record<string, string> = {};
  for (const c of schema.columns) example[c.header] = c.example;
  return buildCsv(headers, [example]);
}
