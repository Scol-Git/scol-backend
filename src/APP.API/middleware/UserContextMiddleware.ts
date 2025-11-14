import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { UserContextAccessor } from '@shared/context/UserContextAccessor';
import { ICurrentUser } from '@shared/interfaces/ICurrentUser.interface';

/**
 * Middleware that populates the UserContextAccessor with the current user.
 *
 * This middleware should be registered globally and run after authentication guards
 * that attach the user to the request object (e.g., JwtAuthGuard).
 *
 * @example
 * // In AppModule or ApiModule:
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(UserContextMiddleware)
 *       .forRoutes('*');
 *   }
 * }
 */
@Injectable()
export class UserContextMiddleware implements NestMiddleware {
  /**
   * Processes the request and establishes user context if authenticated.
   *
   * @param req - Express request object (should have user attached by auth guard)
   * @param res - Express response object
   * @param next - Express next function
   */
  use(req: Request, res: Response, next: NextFunction): void {
    // Extract user from request (set by JwtAuthGuard or other auth mechanism)
    const user = (req as any).user as ICurrentUser | undefined;

    if (user) {
      // Run the rest of the request within the user context
      UserContextAccessor.run(user, () => next());
    } else {
      // No user authenticated - continue without context
      next();
    }
  }
}
