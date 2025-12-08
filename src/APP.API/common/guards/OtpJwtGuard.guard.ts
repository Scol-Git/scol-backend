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
 * OTP JWT Guard
 *
 * Validates OTP verification tokens (short-lived tokens with aud=otp).
 * Used for /verify-otp and /resend-otp endpoints.
 * Attaches OTP user payload to request.otpUser
 */
@Injectable()
export class OtpJwtGuard implements CanActivate {
  constructor(
    @Inject(IJwtServiceToken) private readonly jwtService: IJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this._extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing OTP verification token');
    }

    try {
      const payload = this.jwtService.verifyOtpToken(token);

      // Attach OTP payload to request
      (request as Request & { otpUser: OtpUserPayload }).otpUser = {
        userId: payload.userId,
        phone: payload.phone,
        purpose: payload.purpose,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException(
        'Invalid or expired OTP verification token',
      );
    }
  }

  private _extractToken(request: Request): string | null {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    return authHeader.substring(7);
  }
}
