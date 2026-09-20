import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import type { IJwtService } from '@shared/interfaces/security';
import type { OtpUserPayload } from '@shared/interfaces/auth/OtpUserPayload.interface';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';

/**
 * OTP JWT Body Guard
 *
 * Validates OTP verification tokens sent in the request body as `otpAccessToken`.
 * Used by V2 verify-otp and resend-otp endpoints.
 * Attaches OTP user payload to request.otpUser (same shape as OtpJwtGuard).
 */
@Injectable()
export class OtpJwtBodyGuard implements CanActivate {
  constructor(
    @Inject(IJwtServiceToken) private readonly jwtService: IJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this._extractToken(request);

    if (!token) {
      throw new UnauthorizedException('OTP verification token missing');
    }

    try {
      const payload = this.jwtService.verifyOtpToken(token);

      (request as Request & { otpUser: OtpUserPayload }).otpUser = {
        pendingId: payload.pendingId,
        userId: payload.userId,
        phone: payload.phone,
        purpose: payload.purpose as 'phone_verify' | 'password_reset',
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid OTP verification token');
    }
  }

  private _extractToken(request: Request): string | null {
    const token = (request.body as { otpAccessToken?: unknown } | undefined)
      ?.otpAccessToken;

    if (typeof token !== 'string' || token.trim().length === 0) {
      return null;
    }

    return token;
  }
}
