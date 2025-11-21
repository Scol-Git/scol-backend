import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './JwtAuthGuard.guard';
import { PermissionGuard } from './PermissionGuard.guard';
import { RoleGuard } from './RoleGuard.guard';

/**
 * Guards Module
 *
 * Global module that provides authentication and authorization guards.
 * Makes guards available to all modules without explicit imports.
 *
 * Guards registered here:
 * - JwtAuthGuard: Validates JWT tokens
 * - PermissionGuard: Checks user permissions
 * - RoleGuard: Checks user roles
 */
@Global()
@Module({
  providers: [JwtAuthGuard, PermissionGuard, RoleGuard],
  exports: [JwtAuthGuard, PermissionGuard, RoleGuard],
})
export class GuardsModule {}
