import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ICurrentUser } from '@shared/interfaces/domain';
import { Permission } from '@shared/enums/Permission.enum';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Permission Guard
 *
 * Checks if the authenticated user has the required permissions.
 * Used with @RequirePermission() decorator.
 *
 * @class PermissionGuard
 */
@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private readonly _reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this._reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // No permissions required, allow access
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: ICurrentUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User is not authenticated');
    }

    // Check if user has any of the required permissions
    // Convert enum values to strings for comparison
    const requiredPermissionStrings = requiredPermissions.map((p) => String(p));
    const hasPermission = requiredPermissionStrings.some((permission) =>
      user.permissions?.includes(permission),
    );

    // Super admin bypass
    if (user.isSuperAdmin) {
      return true;
    }

    if (!hasPermission) {
      throw new ForbiddenException(
        'Required user permission missing',
      );
    }

    return true;
  }
}
