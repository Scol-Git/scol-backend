import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './JwtAuthGuard.guard';
import { PermissionGuard } from './PermissionGuard.guard';
import { RoleGuard } from './RoleGuard.guard';
import { RateLimitGuard } from './RateLimitGuard.guard';
import { RateLimitingModule } from '@infra/rate-limiting/RateLimitingModule.module';

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
 * - RateLimitGuard: Limits the number of requests
 */
@Global()
@Module({
  imports: [RateLimitingModule], // Import RateLimitingModule to provide IRateLimitingStorage for RateLimitGuard
  providers: [JwtAuthGuard, PermissionGuard, RoleGuard, RateLimitGuard],
  exports: [JwtAuthGuard, PermissionGuard, RoleGuard, RateLimitGuard],
})
export class GuardsModule {}
