import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { CsvImportProcessor } from '../abstractions/CsvImportProcessor';
import type { CsvImportSchema } from '../abstractions/CsvImportSchema';
import type { ImportResult } from '../abstractions/ImportResult';
import type { CsvRow } from '../abstractions/CsvImportProcessor';
import { parseCsv } from './CsvParser';
import { validateSchema } from './HeaderValidator';
import { buildCsvBuffer } from './CsvWriter';
import { createReadStream } from 'fs';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parse: parseStream } = require('csv-parse') as {
  parse: (options: object) => NodeJS.ReadWriteStream;
};

export interface CsvImportPipelineOptions {
  /**
   * When false, the processor runs without an outer transaction (e.g. course import
   * uses per-batch inner transactions). Default true (university import).
   */
  wrapInTransaction?: boolean;
  /**
   * Max parsed rows per processor call when streaming from file.
   * Used by executeFromFile; default 5000.
   */
  parseBatchSize?: number;
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

  async executeFromFile(
    csvFilePath: string,
    schema: CsvImportSchema,
    processor: CsvImportProcessor,
    options?: CsvImportPipelineOptions,
  ): Promise<ImportResult> {
    const wrap = options?.wrapInTransaction !== false;
    const parseBatchSize = Math.max(1, options?.parseBatchSize ?? 5000);
    const reviewedRows: Array<Record<string, string>> = [];
    const errorRows: (Record<string, string> & { errorReason: string })[] = [];
    const parser = createReadStream(csvFilePath).pipe(
      parseStream({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
      }),
    ) as AsyncIterable<CsvRow>;

    let batch: CsvRow[] = [];
    let sawAnyRow = false;
    let validatedSchema = false;

    const flushBatch = async (): Promise<void> => {
      if (batch.length === 0) return;
      const current = batch;
      batch = [];
      const processed = wrap
        ? await this.db.transaction((manager) =>
            processor.processRows(manager, current),
          )
        : await processor.processRows(this.db.manager, current);
      reviewedRows.push(...processed.reviewedRows);
      errorRows.push(...processed.errorRows);
    };

    for await (const row of parser) {
      if (!validatedSchema) {
        validateSchema([row], schema.inputHeaders);
        validatedSchema = true;
      }
      sawAnyRow = true;
      batch.push(row);
      if (batch.length >= parseBatchSize) {
        await flushBatch();
      }
    }

    if (!sawAnyRow) {
      validateSchema([], schema.inputHeaders);
    }
    await flushBatch();

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
