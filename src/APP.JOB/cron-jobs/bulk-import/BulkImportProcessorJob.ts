import { Inject, Injectable } from '@nestjs/common';
import { BaseCronJob } from '@job/core/BaseCronJob';
import { BulkImportProcessor } from '@bll/crm-services/bulk-imports/BulkImportProcessor';
import { JOB_KEYS } from '@shared/constants/job-keys.constant';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

/** Picks up QUEUED bulk-import batches (also nudged immediately by confirm-upload). */
@Injectable()
export class BulkImportProcessorJob extends BaseCronJob {
  readonly key = JOB_KEYS.bulkImportProcessor;

  constructor(
    private readonly processor: BulkImportProcessor,
    @Inject(ILoggerToken) protected readonly logger: ILogger,
  ) {
    super();
  }

  protected async run(): Promise<Record<string, unknown>> {
    await this.processor.runNext();
    return {};
  }
}
