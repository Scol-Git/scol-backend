import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { ICurrentUser } from '@shared/interfaces/domain';

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
 * async getProfile(@CurrentUser() user: ICurrentUser) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): ICurrentUser => {
    const request = ctx.switchToHttp().getRequest<{ user: ICurrentUser }>();
    return request.user;
  },
);
