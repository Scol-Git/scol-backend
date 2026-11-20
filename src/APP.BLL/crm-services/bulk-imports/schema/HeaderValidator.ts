import type { ImportSchema } from './defineImportSchema';

export interface HeaderCheck {
  missing: string[];
  ignored: string[];
}

/** Header matching is exact (case-sensitive): the template defines the headers. */
export function checkHeaders(schema: ImportSchema, headers: string[]): HeaderCheck {
  const known = new Set(schema.columns.map((c) => c.header));
  const present = new Set(headers);
  return {
    missing: schema.columns.map((c) => c.header).filter((h) => !present.has(h)),
    ignored: headers.filter((h) => !known.has(h) && h !== ''),
  };
}
