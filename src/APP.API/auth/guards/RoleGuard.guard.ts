import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { IJwtService, JwtPayload } from '@shared/interfaces/security';
import { IJwtService as IJwtServiceToken } from '@shared/tokens/injection.tokens';

export const ROLES_KEY = 'roles';

/**
 * Role Guard
 *
 * Checks if the authenticated user has one of the required roles.
 * Used with @RequireRole() decorator.
 *
 * @class RoleGuard
 */
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly _reflector: Reflector,
    @Inject(IJwtServiceToken) private readonly _jwtService: IJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this._reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      // No roles required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required roles
    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    // Super admin bypass
    if (user.isSuperAdmin) {
      return true;
    }

    if (!hasRole) {
      throw new ForbiddenException(
        `Missing required role. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
