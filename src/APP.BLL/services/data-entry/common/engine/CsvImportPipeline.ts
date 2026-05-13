import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type {
  CsvImportRowProcessor,
  CsvRow,
} from '../abstractions/CsvImportProcessor';
import type { CsvImportSchema } from '../abstractions/CsvImportSchema';
import type { ImportResult } from '../abstractions/ImportResult';
import { parseCsv } from './CsvParser';
import { validateSchema } from './HeaderValidator';
import { buildCsvBuffer } from './CsvWriter';

@Injectable()
export class CsvImportPipeline {
  constructor(private readonly db: AppDbContext) {}

  /**
   * Full import inside one outer transaction (university and course bulk import).
   */
  async executeInTransaction(
    csvText: string,
    schema: CsvImportSchema,
    processor: CsvImportRowProcessor,
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

  /**
   * Parse and validate headers; processor runs on the root manager with no outer transaction.
   * Use when the processor opens its own transactions; bulk imports use {@link executeInTransaction}.
   */
  async execute(
    csvText: string,
    schema: CsvImportSchema,
    processor: CsvImportRowProcessor,
  ): Promise<ImportResult> {
    const rows = parseCsv(csvText);
    validateSchema(rows, schema.inputHeaders);

    const { reviewedRows, errorRows } = await processor.processRows(
      this.db.manager,
      rows,
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
