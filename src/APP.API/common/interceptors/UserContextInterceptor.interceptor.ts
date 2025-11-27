import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { UserContextAccessor } from '@shared/context/UserContextAccessor';
import type { ICurrentUser } from '@shared/interfaces/domain';

/**
 * User Context Interceptor
 *
 * Establishes user context in AsyncLocalStorage after authentication guards have run.
 * Interceptors run AFTER guards, so req.user will be available if authentication succeeded.
 *
 * This interceptor should be registered globally to ensure user context is available
 * in all services and repositories throughout the request lifecycle.
 *
 * Execution order:
 * 1. Middleware (runs first)
 * 2. Guards (set req.user)
 * 3. Interceptors (this one - sets AsyncLocalStorage context) ← WE ARE HERE
 * 4. Pipes
 * 5. Controller
 *
 * @example
 * // In main.ts:
 * app.useGlobalInterceptors(new UserContextInterceptor());
 */
@Injectable()
export class UserContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as Request & { user?: ICurrentUser }).user;

    if (user) {
      // Run the rest of the request within the user context
      // Wrap the observable chain in UserContextAccessor.run() to establish context
      return new Observable((subscriber) => {
        UserContextAccessor.run(user, () => {
          const observable = next.handle();
          observable.subscribe({
            next: (value) => subscriber.next(value),
            error: (error) => subscriber.error(error),
            complete: () => subscriber.complete(),
          });
        });
      });
    }

    // No user authenticated - continue without context
    return next.handle();
  }
}

