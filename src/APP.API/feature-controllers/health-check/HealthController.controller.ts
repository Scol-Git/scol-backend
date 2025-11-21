import { Controller, Get, Inject } from '@nestjs/common';
import type { ILogger } from '@shared/interfaces/logging';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import {
  ILogger as ILoggerToken,
  ICacheService as ICacheServiceToken,
} from '@shared/tokens/injection.tokens';

@Controller('health')
export class HealthController {
  constructor(
    @Inject(ILoggerToken) private readonly _logger: ILogger,
    @Inject(ICacheServiceToken) private readonly _cacheService: ICacheService,
  ) {}

  @Get()
  async ping() {
    this._logger.LogInfo('Health check hit');

    // Check cache health
    let cacheStatus = 'unknown';
    try {
      const testKey = 'health:check';
      await this._cacheService.set(testKey, { timestamp: Date.now() }, 10);
      const value = await this._cacheService.get(testKey);
      cacheStatus = value ? 'healthy' : 'unhealthy';
      await this._cacheService.remove(testKey);
    } catch (error) {
      cacheStatus = 'error';
      this._logger.LogWarning('Cache health check failed', { error });
    }

    return {
      ok: true,
      now: new Date().toISOString(),
      cache: cacheStatus,
    };
  }
}
