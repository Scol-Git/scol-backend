import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../guards/PermissionGuard.guard';
import { Permission } from '@shared/enums/Permission.enum';

/**
 * RequirePermission Decorator
 *
 * Specifies which permissions are required to access an endpoint.
 * Must be used with PermissionGuard.
 *
 * @param permissions - Array of Permission enum values (e.g., Permission.TODO_CREATE, Permission.PROJECT_DELETE)
 *
 * @example
 * ```typescript
 * @Post('todos')
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @RequirePermission(Permission.TODO_CREATE)
 * async createTodo(@Body() dto: CreateTodoDto) {
 *   // ...
 * }
 * ```
 */
export const RequirePermission = (...permissions: Permission[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);

