import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { ICsvImportProcessor } from '../abstractions/ICsvImportProcessor';
import type { CsvImportSchema } from '../abstractions/CsvImportSchema';
import type { ImportResult } from '../abstractions/ImportResult';
import { parseCsv } from './CsvParser';
import { validateSchema } from './HeaderValidator';
import { buildCsvBuffer } from './CsvWriter';

/**
 * Stateless executor: parse → validate schema → process rows (transaction) → build CSV buffers.
 * Processor is passed per call for extensibility (e.g. university vs course import).
 */
@Injectable()
export class CsvImportExecutor {
  constructor(private readonly db: AppDbContext) {}

  async execute(
    csvText: string,
    schema: CsvImportSchema,
    processor: ICsvImportProcessor,
  ): Promise<ImportResult> {
    const rows = parseCsv(csvText);
    validateSchema(rows, schema.inputHeaders);

    const { reviewedRows, errorRows } = await this.db.transaction((manager) =>
      processor.processRows(manager, rows),
    );

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
