import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../guards/PermissionGuard.guard';

/**
 * RequirePermission Decorator
 *
 * Specifies which permissions are required to access an endpoint.
 * Must be used with PermissionGuard.
 *
 * @param permissions - Array of permission names (e.g., 'todo:create', 'project:delete')
 *
 * @example
 * ```typescript
 * @Post('todos')
 * @UseGuards(JwtAuthGuard, PermissionGuard)
 * @RequirePermission('todo:create')
 * async createTodo(@Body() dto: CreateTodoDto) {
 *   // ...
 * }
 * ```
 */
export const RequirePermission = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
