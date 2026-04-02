import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { Role } from '@shared/enums/Role.enum';

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
  constructor(private readonly _reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this._reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      // No roles required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: ICurrentUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Check if user has any of the required roles
    // Convert enum values to strings for comparison
    const requiredRoleStrings = requiredRoles.map(r => String(r));
    const hasRole = requiredRoleStrings.some((role) => user.roles?.includes(role));

    // Super admin bypass
    if (user.isSuperAdmin) {
      return true;
    }

    if (!hasRole) {
      throw new ForbiddenException(
        'Required user role missing',
      );
    }

    return true;
  }
}

