import { Controller, Get, Inject } from '@nestjs/common';
import type { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(ILoggerToken) private readonly _logger: ILogger,
  ) {}

  @Get()
  ping() {
    this._logger.LogInfo('Health check hit');
    return { ok: true, now: new Date().toISOString() };
  }
}
