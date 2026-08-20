import { Inject, Injectable } from '@nestjs/common';
import { BaseCronJob } from '@job/core/BaseCronJob';
import { OtpSessionCleanupService } from '@bll/job-services/otp/OtpSessionCleanupService';
import { JOB_KEYS } from '@shared/constants/job-keys.constant';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

@Injectable()
export class OtpSessionCleanupJob extends BaseCronJob {
  readonly key = JOB_KEYS.otpSessionCleanup;

  constructor(
    private readonly cleanupService: OtpSessionCleanupService,
    @Inject(ILoggerToken) protected readonly logger: ILogger,
  ) {
    super();
  }

  protected async run(): Promise<Record<string, unknown>> {
    const deleted = await this.cleanupService.cleanupExpiredOtpSessions();
    return { deleted };
  }
}
