import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { OtpUserPayload } from '@shared/interfaces/auth/OtpUserPayload.interface';

/**
 * OtpUser Decorator
 *
 * Extracts the OTP user payload from the request.
 * Must be used after OtpJwtGuard.
 *
 * @example
 * ```typescript
 * @Post('verify-otp')
 * @UseGuards(OtpJwtGuard)
 * async verifyOtp(
 *   @OtpUser() otpUser: OtpUserPayload,
 *   @Body() dto: VerifyOtpDto
 * ) {
 *   return this.authService.verifyOtp(dto, otpUser);
 * }
 * ```
 */
export const OtpUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): OtpUserPayload => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ otpUser: OtpUserPayload }>();
    return request.otpUser;
  },
);
