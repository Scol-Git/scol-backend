import { Controller, Get } from '@nestjs/common';
import { Logger } from '@infra/logging/Logger.service';

@Controller('health')
export class HealthController {
  constructor(private readonly _logger: Logger) {}

  @Get()
  ping() {
    this._logger.LogInfo('Health check hit');
    return { ok: true, now: new Date().toISOString() };
  }
}
