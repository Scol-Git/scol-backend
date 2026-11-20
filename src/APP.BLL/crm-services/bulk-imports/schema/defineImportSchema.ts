import type { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import type { CellParser } from './parsers';

export type ImportEntity = 'university' | 'course' | 'intake' | 'engReq' | 'scholarship';
export type RequiredLevel = 'import' | 'publish';
export type LookupTable =
  | 'country'
  | 'state'
  | 'city'
  | 'programme'
  | 'degree'
  | 'englishTest'
  | 'university';
export interface LookupSpec {
  table: LookupTable;
  mode: 'strict' | 'orDraft';
}

export interface ImportColumn {
  /** Exact CSV header. */
  header: string;
  entity: ImportEntity;
  /**
   * DB column name on the entity's table (e.g. 'sysCountryId', 'tuitionFee').
   * For columns that do not map 1:1 (intakeInfo, English, scholarship) use the
   * handler key documented in the schema file.
   */
  field: string;
  parse: CellParser<unknown>;
  lookup?: LookupSpec;
  required?: RequiredLevel;
  /** Used in the template's example row. */
  example: string;
}

export interface ImportSchema {
  type: BulkImportType;
  columns: readonly ImportColumn[];
  /** Headers accepted but ignored (old templates). Reported once as IGNORED_COLUMN. */
  ignoredHeaders?: readonly string[];
}

export function defineImportSchema(schema: ImportSchema): ImportSchema {
  const seen = new Set<string>();
  for (const c of schema.columns) {
    if (seen.has(c.header)) throw new Error(`Duplicate header in schema: ${c.header}`);
    seen.add(c.header);
    if (c.required === 'publish' && c.entity === 'scholarship') {
      throw new Error(`required:'publish' is not supported on ${c.entity} columns (${c.header})`);
    }
    if (c.required === 'publish' && c.entity === 'engReq' && !/^[A-Za-z]+\.(minOverallReq|minSectionReq)$/.test(c.field)) {
      throw new Error(`required:'publish' on engReq must use Test.minOverallReq or Test.minSectionReq (${c.header})`);
    }
  }
  return schema;
}
