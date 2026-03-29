import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { CsvImportProcessor } from '../abstractions/CsvImportProcessor';
import type { CsvImportSchema } from '../abstractions/CsvImportSchema';
import type { ImportResult } from '../abstractions/ImportResult';
import { parseCsv } from './CsvParser';
import { validateSchema } from './HeaderValidator';
import { buildCsvBuffer } from './CsvWriter';

export interface CsvImportPipelineOptions {
  /**
   * When false, the processor runs without an outer transaction (e.g. course import
   * uses per-batch inner transactions). Default true (university import).
   */
  wrapInTransaction?: boolean;
}

@Injectable()
export class CsvImportPipeline {
  constructor(private readonly db: AppDbContext) {}

  async execute(
    csvText: string,
    schema: CsvImportSchema,
    processor: CsvImportProcessor,
    options?: CsvImportPipelineOptions,
  ): Promise<ImportResult> {
    const rows = parseCsv(csvText);
    validateSchema(rows, schema.inputHeaders);

    const wrap = options?.wrapInTransaction !== false;
    const { reviewedRows, errorRows } = wrap
      ? await this.db.transaction((manager) =>
          processor.processRows(manager, rows),
        )
      : await processor.processRows(this.db.manager, rows);

    const reviewedCsv = buildCsvBuffer(reviewedRows, schema.reviewedHeaders);
    const errorsCsv = buildCsvBuffer(errorRows, schema.errorHeaders);

    return {
      reviewedCsv,
      errorsCsv,
      reviewedCount: reviewedRows.length,
      errorsCount: errorRows.length,
    };
  }
}
