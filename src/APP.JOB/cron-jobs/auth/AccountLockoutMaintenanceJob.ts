import { Inject, Injectable } from '@nestjs/common';
import { BaseCronJob } from '@job/core/BaseCronJob';
import { AccountLockoutMaintenanceService } from '@bll/job-services/auth/AccountLockoutMaintenanceService';
import { JOB_KEYS } from '@shared/constants/job-keys.constant';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

@Injectable()
export class AccountLockoutMaintenanceJob extends BaseCronJob {
  readonly key = JOB_KEYS.accountLockoutMaintenance;

  constructor(
    private readonly maintenanceService: AccountLockoutMaintenanceService,
    @Inject(ILoggerToken) protected readonly logger: ILogger,
  ) {
    super();
  }

  protected async run(): Promise<Record<string, unknown>> {
    return await this.maintenanceService.runMaintenance();
  }
}
