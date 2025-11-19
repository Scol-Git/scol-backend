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
  constructor(
    private readonly _reflector: Reflector,
    @Inject(IJwtServiceToken) private readonly _jwtService: IJwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this._reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      // No permissions required, allow access
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user has any of the required permissions
    const hasPermission = requiredPermissions.some((permission) =>
      user.permissions?.includes(permission),
    );

    // Super admin bypass
    if (user.isSuperAdmin) {
      return true;
    }

    if (!hasPermission) {
      throw new ForbiddenException(
        `Missing required permission. Required: ${requiredPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
