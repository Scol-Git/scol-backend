import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import type { DataSource, EntityManager } from 'typeorm';
import { BulkImportStatus } from '@shared/enums/crm/BulkImportStatus.enum';
import type { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';

/** A claimed batch (raw row, camelCase as stored). */
export interface ClaimedBatch {
  id: string;
  type: BulkImportType;
  originalFileKey: string;
  fileName: string;
  uploadedBy: string;
}

export interface FinishPayload {
  status: BulkImportStatus;
  totalRows: number;
  processedRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  errorCount: number;
  warningCount: number;
  errorsFileKey: string | null;
  failureReason: string | null;
  fileHash: string | null;
}

/** Raw SQL for the DB-backed job queue. All statements are parameterised. */
@Injectable()
export class BulkImportQueueRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  /** Stuck-job recovery and abandoned-upload cleanup. Called at the start of every run. */
  async housekeeping(): Promise<void> {
    await this.dataSource.query(
      `UPDATE "BulkImportBatches"
       SET "status" = CASE WHEN "retryCount" >= 1 THEN 'FAILED' ELSE 'QUEUED' END,
           "failureReason" = CASE WHEN "retryCount" >= 1 THEN 'Processing failed unexpectedly. Please try again or contact support.' ELSE NULL END,
           "retryCount" = "retryCount" + 1, "updatedAt" = now()
       WHERE "status" = 'PROCESSING' AND "heartbeatAt" < now() - interval '10 minutes' AND "deletedAt" IS NULL`,
    );
    await this.dataSource.query(
      `UPDATE "BulkImportBatches"
       SET "status" = 'FAILED', "failureReason" = 'Upload not completed within 24 hours.', "updatedAt" = now()
       WHERE "status" = 'AWAITING_UPLOAD' AND "createdAt" < now() - interval '24 hours' AND "deletedAt" IS NULL`,
    );
  }

  /** Claims the oldest QUEUED batch. Only one batch may be PROCESSING across all instances. */
  async claim(): Promise<ClaimedBatch | null> {
    return this.dataSource.transaction(async (em) => {
      const lock = (await em.query(
        `SELECT pg_try_advisory_xact_lock(hashtext('bulk-import-claim')) AS locked`,
      )) as Array<{ locked: boolean }>;
      if (!lock[0]?.locked) return null;

      const result = (await em.query(
        `UPDATE "BulkImportBatches" b
         SET "status" = 'PROCESSING', "startedAt" = now(), "heartbeatAt" = now(), "updatedAt" = now()
         WHERE b.id = (
           SELECT id FROM "BulkImportBatches"
           WHERE "status" = 'QUEUED' AND "deletedAt" IS NULL
           ORDER BY "queuedAt" ASC
           LIMIT 1
           FOR UPDATE SKIP LOCKED
         )
         AND NOT EXISTS (SELECT 1 FROM "BulkImportBatches" WHERE "status" = 'PROCESSING' AND "deletedAt" IS NULL)
         RETURNING b.id, b."type", b."originalFileKey", b."fileName", b."uploadedBy"`,
      )) as unknown as [ClaimedBatch[], number];
      // UPDATE ... RETURNING through TypeORM returns [rows, rowCount]
      return result[0]?.[0] ?? null;
    });
  }

  /** Heartbeat + progress, once per chunk. */
  async heartbeat(em: EntityManager | DataSource['manager'], batchId: string, processedRows: number): Promise<void> {
    await em.query(
      `UPDATE "BulkImportBatches" SET "heartbeatAt" = now(), "processedRows" = $2, "updatedAt" = now() WHERE id = $1`,
      [batchId, processedRows],
    );
  }

  async finish(batchId: string, p: FinishPayload): Promise<void> {
    await this.dataSource.query(
      `UPDATE "BulkImportBatches"
       SET "status" = $2, "totalRows" = $3, "processedRows" = $4, "createdCount" = $5, "updatedCount" = $6,
           "skippedCount" = $7, "errorCount" = $8, "warningCount" = $9, "errorsFileKey" = $10,
           "failureReason" = $11, "fileHash" = COALESCE($12, "fileHash"), "processedAt" = now(), "updatedAt" = now()
       WHERE id = $1`,
      [
        batchId, p.status, p.totalRows, p.processedRows, p.createdCount, p.updatedCount,
        p.skippedCount, p.errorCount, p.warningCount, p.errorsFileKey, p.failureReason, p.fileHash,
      ],
    );
  }

  async fail(batchId: string, reason: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE "BulkImportBatches"
       SET "status" = 'FAILED', "failureReason" = $2, "processedAt" = now(), "updatedAt" = now()
       WHERE id = $1`,
      [batchId, reason],
    );
  }
}
