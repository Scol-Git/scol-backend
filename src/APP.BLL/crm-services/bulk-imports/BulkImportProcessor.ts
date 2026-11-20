import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { IStorageService as IStorageServiceToken, ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import type { IStorageService } from '@shared/interfaces/IStorageService.interface';
import type { ILogger } from '@shared/interfaces/logging';
import { BulkImportStatus } from '@shared/enums/crm/BulkImportStatus.enum';
import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import {
  BulkImportQueueRepository,
  type ClaimedBatch,
} from './BulkImportQueueRepository';
import { BulkImportStorageKeyBuilder } from './helpers/BulkImportStorageKeyBuilder';
import type { BulkImportHandler, ValidRow } from './common/BulkImportHandler';
import { FAILURE_REASON, ImportErrorCode } from './common/ImportErrorCode';
import {
  InvalidEncodingError,
  decodeUtf8Strict,
  parseCsv,
  type ParsedCsv,
} from './common/CsvParser';
import { DbPressureGuard } from './common/DbPressureGuard';
import { ImportReport } from './common/ImportReport';
import { runInTx } from './common/inTx';
import { checkHeaders } from './schema/HeaderValidator';
import { UniversityImportHandler } from './university/UniversityImportHandler';
import { CourseImportHandler } from './course/CourseImportHandler';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = BulkImportHandler<any>;

class FileProblem extends Error {}

@Injectable()
export class BulkImportProcessor {
  /** In-process guard (cron tick + confirm-upload nudge can overlap). */
  private running = false;

  constructor(
    private readonly queueRepo: BulkImportQueueRepository,
    @Inject(IStorageServiceToken) private readonly storage: IStorageService,
    private readonly keyBuilder: BulkImportStorageKeyBuilder,
    private readonly universityHandler: UniversityImportHandler,
    private readonly courseHandler: CourseImportHandler,
    private readonly pressureGuard: DbPressureGuard,
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(ILoggerToken) private readonly logger: ILogger,
    private readonly config: ConfigService,
  ) {}

  /** Called by the cron job and by confirm-upload. Processes at most ONE batch. */
  async runNext(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.queueRepo.housekeeping();
      const batch = await this.queueRepo.claim();
      if (!batch) return;
      await this.process(batch);
    } catch (err) {
      this.logger.LogError('Bulk import runNext failed', err, { context: 'BulkImportProcessor' });
    } finally {
      this.running = false;
    }
  }

  private async process(batch: ClaimedBatch): Promise<void> {
    const started = Date.now();
    this.logger.LogInfo('Bulk import claimed', { batchId: batch.id, type: batch.type });
    try {
      const handler = this.handlerFor(batch.type);
      const { file, hash } = await this.readFile(batch);
      const headerCheck = checkHeaders(handler.schema, file.headers);
      if (headerCheck.missing.length) {
        throw new FileProblem(FAILURE_REASON.missingColumns(headerCheck.missing));
      }
      const report = new ImportReport(file.headers, file.rows);
      const ignored = [...new Set([...headerCheck.ignored, ...(handler.schema.ignoredHeaders?.filter((h) => file.headers.includes(h)) ?? [])])];
      report.addIgnoredColumns(ignored);

      const valid = await this.phase0Validate(handler, file, report);
      const ctx = await this.dataSource.manager.transaction((em) => handler.prefetch(valid, em)); // Phase 1 (read-only)
      const resolvable = this.phase1Resolve(handler, valid, ctx, report);
      if (resolvable.length > 0) {
        await this.inTx((em) => handler.createParents(resolvable, ctx, em, batch.id)); // Phase 2
        await this.phase3WriteChunks(handler, batch, resolvable, ctx, report); // Phase 3
      }
      await this.phase4Finish(batch, file, hash, report, started);
    } catch (err) {
      if (err instanceof FileProblem) {
        await this.queueRepo.fail(batch.id, err.message);
        this.logger.LogWarning('Bulk import failed (file problem)', { batchId: batch.id, reason: err.message });
        return;
      }
      this.logger.LogError('Bulk import failed', err, { context: 'BulkImportProcessor', batchId: batch.id });
      await this.queueRepo.fail(batch.id, FAILURE_REASON.UNEXPECTED);
    }
  }

  private handlerFor(type: BulkImportType): AnyHandler {
    return type === BulkImportType.UNIVERSITY ? this.universityHandler : this.courseHandler;
  }

  private inTx = <T>(fn: (em: EntityManager) => Promise<T>): Promise<T> => runInTx(this.dataSource, fn);

  private async readFile(batch: ClaimedBatch): Promise<{ file: ParsedCsv; hash: string }> {
    const size = await this.storage.getObjectSize(batch.originalFileKey);
    if (size === null) throw new FileProblem(FAILURE_REASON.FILE_NOT_FOUND);
    const bytes = await this.storage.getObjectBytes(batch.originalFileKey);
    let text: string;
    try {
      text = decodeUtf8Strict(bytes);
    } catch (e) {
      if (e instanceof InvalidEncodingError) throw new FileProblem(FAILURE_REASON.INVALID_ENCODING);
      throw e;
    }
    if (text.includes('�')) throw new FileProblem(FAILURE_REASON.INVALID_ENCODING);
    const file = parseCsv(text);
    if (file.headers.length === 0 || file.rows.length === 0) throw new FileProblem(FAILURE_REASON.EMPTY_FILE);
    const max = Number(this.config.get<string>('BULK_IMPORT_MAX_ROWS', '20000'));
    if (file.rows.length > max) throw new FileProblem(FAILURE_REASON.tooManyRows(file.rows.length, max));
    return { file, hash: createHash('sha256').update(bytes).digest('hex') };
  }

  /** Phase 0 - pure validation + duplicate keys. Yields to the event loop every 1000 rows. */
  private async phase0Validate(handler: AnyHandler, file: ParsedCsv, report: ImportReport): Promise<ValidRow[]> {
    const now = new Date();
    const valid: ValidRow[] = [];
    const seen = new Map<string, number>();
    for (let i = 0; i < file.rows.length; i++) {
      const rowNumber = i + 2;
      const r = handler.validate({ rowNumber, raw: file.rows[i] }, now);
      if (!r.valid) {
        report.addIssues(rowNumber, r.issues);
        continue;
      }
      const key = handler.naturalKey(r.valid);
      const firstRow = seen.get(key);
      if (firstRow !== undefined) {
        report.addIssues(rowNumber, [
          ...r.issues,
          {
            severity: 'ERROR',
            code: ImportErrorCode.DUPLICATE_ROW,
            message: `Same ${handler.type === BulkImportType.UNIVERSITY ? 'university' : 'course'} as row ${firstRow}. Put each one in one row only.`,
          },
        ]);
        continue;
      }
      seen.set(key, rowNumber);
      report.addIssues(rowNumber, r.issues); // warnings (MISSING_FOR_PUBLISH)
      valid.push(r.valid);
      if ((i + 1) % 1000 === 0) await new Promise((res) => setImmediate(res));
    }
    return valid;
  }

  /** Phase 1 - strict lookups. Rows with errors are reported and dropped. */
  private phase1Resolve(handler: AnyHandler, valid: ValidRow[], ctx: unknown, report: ImportReport): ValidRow[] {
    const errors = handler.resolve(valid, ctx);
    for (const [rowNumber, issues] of errors) report.addIssues(rowNumber, issues);
    return valid.filter((r) => !errors.has(r.rowNumber));
  }

  /** Phase 3 - one short transaction per chunk, with a row-by-row fallback to isolate a bad row. */
  private async phase3WriteChunks(
    handler: AnyHandler,
    batch: ClaimedBatch,
    rows: ValidRow[],
    ctx: unknown,
    report: ImportReport,
  ): Promise<void> {
    const size = Math.max(1, Number(this.config.get<string>('BULK_IMPORT_CHUNK_SIZE', '500')));
    let processedSoFar = 0;
    for (let i = 0; i < rows.length; i += size) {
      const chunk = rows.slice(i, i + size);
      await this.pressureGuard.waitForCapacity();
      try {
        const outcome = await this.inTx(async (em) => {
          const o = await handler.writeChunk(chunk, ctx, em, batch.id);
          await this.queueRepo.heartbeat(em, batch.id, processedSoFar + chunk.length);
          return o;
        });
        report.addOutcome(outcome);
      } catch (err) {
        this.logger.LogWarning('Bulk import chunk failed; retrying row by row', { batchId: batch.id });
        for (const row of chunk) {
          try {
            report.addOutcome(await this.inTx((em) => handler.writeChunk([row], ctx, em, batch.id)));
          } catch (rowErr) {
            report.addError(row.rowNumber, ImportErrorCode.UNEXPECTED_ERROR, 'Could not be saved. Check the values or contact support.');
            this.logger.LogError('Bulk import row failed', rowErr, { batchId: batch.id, rowNumber: row.rowNumber });
          }
        }
        this.logger.LogError('Bulk import chunk error', err, { batchId: batch.id });
        await this.queueRepo.heartbeat(this.dataSource.manager, batch.id, processedSoFar + chunk.length);
      }
      processedSoFar += chunk.length;
    }
  }

  private async phase4Finish(
    batch: ClaimedBatch,
    file: ParsedCsv,
    hash: string,
    report: ImportReport,
    started: number,
  ): Promise<void> {
    let errorsFileKey: string | null = null;
    if (report.hasIssues) {
      errorsFileKey = this.keyBuilder.errorsKey(batch.type, batch.id);
      await this.storage.putObject(errorsFileKey, report.buildErrorsCsv(), 'text/csv');
    }
    const status = report.created + report.updated > 0 ? BulkImportStatus.IN_REVIEW : BulkImportStatus.NO_CHANGES;
    await this.queueRepo.finish(batch.id, {
      status,
      totalRows: file.rows.length,
      processedRows: file.rows.length,
      createdCount: report.created,
      updatedCount: report.updated,
      skippedCount: report.skipped,
      errorCount: report.errorCount,
      warningCount: report.warningCount,
      errorsFileKey,
      failureReason: null,
      fileHash: hash,
    });
    this.logger.LogInfo('Bulk import finished', {
      batchId: batch.id,
      status,
      created: report.created,
      updated: report.updated,
      skipped: report.skipped,
      errors: report.errorCount,
      warnings: report.warningCount,
      durationMs: Date.now() - started,
    });
  }
}
