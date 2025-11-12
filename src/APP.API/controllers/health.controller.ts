// controller example
import { Controller, Get } from '@nestjs/common';
import { AppLogger } from '@infra/logging/AppLogger.service';

@Controller('health')
export class HealthController {
  constructor(private readonly logger: AppLogger) {}

  @Get()
  ping() {
    this.logger.LogInfo('Health check hit');
    return { ok: true, now: new Date().toISOString() };
  }
}
