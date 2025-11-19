import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../guards/RoleGuard.guard';

/**
 * RequireRole Decorator
 *
 * Specifies which roles are required to access an endpoint.
 * Must be used with RoleGuard.
 *
 * @param roles - Array of role names (e.g., 'Admin', 'Manager', 'Member')
 *
 * @example
 * ```typescript
 * @Delete('users/:id')
 * @UseGuards(JwtAuthGuard, RoleGuard)
 * @RequireRole('Admin')
 * async deleteUser(@Param('id') id: string) {
 *   // ...
 * }
 * ```
 */
export const RequireRole = (...roles: string[]) =>
  SetMetadata(ROLES_KEY, roles);
