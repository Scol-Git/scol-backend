import {
  Controller,
  Get,
  UnauthorizedException,
  Headers,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { OtpSessionCleanupService } from '@bll/services/auth/OtpSessionCleanupService';
import { getAppStage } from '@infra/config/getAppStage';

/**
 * Internal Cron Controller
 *
 * Provides HTTP endpoints for Vercel Cron Jobs.
 * These endpoints replace NestJS @Cron decorators for serverless compatibility.
 *
 * Security:
 * - In qa/prod: Requires CRON_SECRET via Authorization header or query param
 * - In dev: Optional validation (allows testing without secret)
 *
 * Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
 */
@Controller('internal/cron')
@ApiTags('Internal')
export class InternalCronController {
  constructor(
    private readonly otpCleanupService: OtpSessionCleanupService,
  ) {}

  /**
   * Cleanup expired OTP sessions
   *
   * Called by Vercel Cron every 5 minutes (configured in vercel.json)
   *
   * @param authHeader - Authorization header (Bearer <CRON_SECRET>)
   * @param querySecret - Fallback secret via query param
   */
  @Get('otp-sessions')
  @ApiExcludeEndpoint() // Hide from public Swagger docs
  async cleanupOtpSessions(
    @Headers('authorization') authHeader?: string,
    @Query('secret') querySecret?: string,
  ): Promise<{ ok: boolean; deleted: number }> {
    const stage = getAppStage();
    const cronSecret = process.env.CRON_SECRET;

    // Verify secret in qa/prod environments
    if (stage !== 'dev') {
      if (!cronSecret) {
        throw new UnauthorizedException('CRON_SECRET not configured');
      }

      // Check Authorization header first, then query param as fallback
      const providedSecret =
        authHeader?.replace('Bearer ', '') || querySecret;

      if (providedSecret !== cronSecret) {
        throw new UnauthorizedException('Invalid cron secret');
      }
    } else if (cronSecret) {
      // In dev, if CRON_SECRET is configured, still validate it
      const providedSecret =
        authHeader?.replace('Bearer ', '') || querySecret;

      if (providedSecret && providedSecret !== cronSecret) {
        throw new UnauthorizedException('Invalid cron secret');
      }
    }
    // In dev without CRON_SECRET, allow through for easy testing

    const deleted = await this.otpCleanupService.cleanupExpiredOtpSessions();

    return { ok: true, deleted };
  }
}

