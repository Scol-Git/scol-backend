import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { CsvImportProcessor } from '../abstractions/CsvImportProcessor';
import type { CsvImportSchema } from '../abstractions/CsvImportSchema';
import type { ImportResult } from '../abstractions/ImportResult';
import { parseCsv } from './CsvParser';
import { validateSchema } from './HeaderValidator';
import { buildCsvBuffer } from './CsvWriter';

@Injectable()
export class CsvImportPipeline {
  constructor(private readonly db: AppDbContext) {}

  async execute(
    csvText: string,
    schema: CsvImportSchema,
    processor: CsvImportProcessor,
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
