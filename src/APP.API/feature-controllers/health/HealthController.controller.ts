import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthCheckService } from '@bll/services/health/HealthCheckService';

/**
 * Health Controller
 *
 * Provides health check endpoints for load balancers, monitoring tools,
 * and uptime services to verify the application is running.
 *
 * Delegates to HealthCheckService (BLL layer) for actual checks.
 */
@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly healthCheckService: HealthCheckService) {}

  /**
   * Basic liveness probe - is the server responding?
   */
  @Get()
  @ApiOperation({ summary: 'Basic health check' })
  @ApiResponse({ status: 200, description: 'Server is alive' })
  health() {
    return this.healthCheckService.getHealth();
  }

  /**
   * Readiness probe - is the server ready to accept traffic?
   * Checks database and Redis connectivity.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check with infrastructure dependencies' })
  @ApiResponse({ status: 200, description: 'Server is ready' })
  async ready() {
    return this.healthCheckService.getReadiness();
  }
}
