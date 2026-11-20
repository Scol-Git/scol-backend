import { Inject, Injectable } from '@nestjs/common';
import { BaseCronJob } from '@job/core/BaseCronJob';
import { BulkImportFileCleanupService } from '@bll/crm-services/bulk-imports/BulkImportFileCleanupService';
import { JOB_KEYS } from '@shared/constants/job-keys.constant';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/** Daily: permanently deletes bulk-import files older than BULK_IMPORT_FILE_RETENTION_DAYS (default 30). */
@Injectable()
export class BulkImportFileCleanupJob extends BaseCronJob {
  readonly key = JOB_KEYS.bulkImportFileCleanup;

  constructor(
    private readonly cleanup: BulkImportFileCleanupService,
    @Inject(ILoggerToken) protected readonly logger: ILogger,
  ) {
    super();
  }

  protected async run(): Promise<Record<string, unknown>> {
    const result = await this.cleanup.run();
    return { ...result };
  }
}
