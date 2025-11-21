import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/RoleGuard.guard';
import { Role } from '@shared/enums/Role.enum';

/**
 * RequireRole Decorator
 *
 * Specifies which roles are required to access an endpoint.
 * Must be used with RoleGuard.
 *
 * @param roles - Array of Role enum values (e.g., Role.ADMIN, Role.MANAGER)
 *
 * @example
 * ```typescript
 * @Delete('users/:id')
 * @UseGuards(JwtAuthGuard, RoleGuard)
 * @RequireRole(Role.ADMIN)
 * async deleteUser(@Param('id') id: string) {
 *   // ...
 * }
 * ```
 */
export const RequireRole = (...roles: Role[]) =>
  SetMetadata(ROLES_KEY, roles);

