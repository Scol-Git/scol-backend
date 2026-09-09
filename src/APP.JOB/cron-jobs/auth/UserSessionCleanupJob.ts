import { Inject, Injectable } from '@nestjs/common';
import { BaseCronJob } from '@job/core/BaseCronJob';
import { UserSessionCleanupService } from '@bll/job-services/auth/UserSessionCleanupService';
import { JOB_KEYS } from '@shared/constants/job-keys.constant';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

@Injectable()
export class UserSessionCleanupJob extends BaseCronJob {
  readonly key = JOB_KEYS.userSessionCleanup;

  constructor(
    private readonly cleanupService: UserSessionCleanupService,
    @Inject(ILoggerToken) protected readonly logger: ILogger,
  ) {
    super();
  }

  protected async run(): Promise<Record<string, unknown>> {
    const deleted = await this.cleanupService.cleanupExpiredSessions();
    return { deleted };
  }
}
