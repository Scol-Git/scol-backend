import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@shared/interfaces/security';

/**
 * CurrentUser Decorator
 *
 * Extracts the current authenticated user from the request.
 * Must be used after JwtAuthGuard.
 *
 * @example
 * ```typescript
 * @Get('profile')
 * @UseGuards(JwtAuthGuard)
 * async getProfile(@CurrentUser() user: JwtPayload) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user as JwtPayload;
  },
);
