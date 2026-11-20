import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { In, IsNull, LessThan, Not } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { BulkImportStatus } from '@shared/enums/crm/BulkImportStatus.enum';
import type { IStorageService } from '@shared/interfaces/IStorageService.interface';
import type { ILogger } from '@shared/interfaces/logging';
import {
  ILogger as ILoggerToken,
  IStorageService as IStorageServiceToken,
} from '@shared/tokens/injection.tokens';

const BATCHES_PER_RUN = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface FileCleanupResult {
  deleted: number;
  failed: number;
}

/** Permanently removes original.csv / errors.csv of batches older than the retention period. */
@Injectable()
export class BulkImportFileCleanupService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(IStorageServiceToken) private readonly storage: IStorageService,
    private readonly config: ConfigService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  get retentionDays(): number {
    const days = Number(this.config.get<string>('BULK_IMPORT_FILE_RETENTION_DAYS', '30'));
    return Number.isFinite(days) && days > 0 ? days : 30;
  }

  async run(now: Date = new Date()): Promise<FileCleanupResult> {
    const cutoff = new Date(now.getTime() - this.retentionDays * DAY_MS);
    const batches = await this.db.bulkImportBatches.find({
      where: {
        createdAt: LessThan(cutoff),
        filesDeletedAt: IsNull(),
        status: Not(In([BulkImportStatus.QUEUED, BulkImportStatus.PROCESSING])),
      },
      select: { id: true, originalFileKey: true, errorsFileKey: true },
      order: { createdAt: 'ASC' },
      take: BATCHES_PER_RUN,
      withDeleted: true,
    });

    let deleted = 0;
    let failed = 0;
    for (const batch of batches) {
      try {
        await this.storage.deleteAllVersions(batch.originalFileKey);
        if (batch.errorsFileKey) await this.storage.deleteAllVersions(batch.errorsFileKey);
        await this.db.bulkImportBatches.update(
          { id: batch.id },
          { filesDeletedAt: now, errorsFileKey: null },
        );
        deleted++;
      } catch (err) {
        failed++;
        this.logger.LogError('Bulk import file cleanup failed', err as Error, {
          context: 'BulkImportFileCleanupService',
          batchId: batch.id,
        });
      }
    }
    return { deleted, failed };
  }
}
