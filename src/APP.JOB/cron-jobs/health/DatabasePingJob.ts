import { Inject, Injectable } from '@nestjs/common';
import { BaseCronJob } from '@job/core/BaseCronJob';
import { DatabasePingService } from '@bll/job-services/health/DatabasePingService';
import { JOB_KEYS } from '@shared/constants/job-keys.constant';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

@Injectable()
export class DatabasePingJob extends BaseCronJob {
  readonly key = JOB_KEYS.databasePing;

  constructor(
    private readonly pingService: DatabasePingService,
    @Inject(ILoggerToken) protected readonly logger: ILogger,
  ) {
    super();
  }

  protected async run(): Promise<Record<string, unknown>> {
    const { latencyMs } = await this.pingService.ping();
    return { latencyMs };
  }
}
