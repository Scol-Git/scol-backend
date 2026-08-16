import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './JwtAuthGuard.guard';
import { PermissionGuard } from './PermissionGuard.guard';
import { RoleGuard } from './RoleGuard.guard';
import { RateLimitGuard } from './RateLimitGuard.guard';
import { OtpJwtGuard } from './OtpJwtGuard.guard';
import { OtpJwtBodyGuard } from './OtpJwtBodyGuard.guard';
import { OptionalJwtAuthGuard } from './OptionalJwtAuthGuard.guard';
import { RateLimitingModule } from '@infra/redis/rate-limiting/RateLimitingModule.module';

/**
 * Guards Module
 *
 * Global module that provides authentication and authorization guards.
 * Makes guards available to all modules without explicit imports.
 *
 * Guards registered here:
 * - JwtAuthGuard: Validates JWT access tokens
 * - OtpJwtGuard: Validates OTP verification tokens
 * - OtpJwtBodyGuard: Validates OTP verification tokens from request body
 * - PermissionGuard: Checks user permissions
 * - RoleGuard: Checks user roles
 * - RateLimitGuard: Limits the number of requests
 * - OptionalJwtAuthGuard: Optional JWT; populates user when valid, allows anonymous otherwise
 */
@Global()
@Module({
  imports: [RateLimitingModule], // Import RateLimitingModule to provide IRateLimitingStorage for RateLimitGuard
  providers: [
    JwtAuthGuard,
    OtpJwtGuard,
    OtpJwtBodyGuard,
    OptionalJwtAuthGuard,
    PermissionGuard,
    RoleGuard,
    RateLimitGuard,
  ],
  exports: [
    JwtAuthGuard,
    OtpJwtGuard,
    OtpJwtBodyGuard,
    OptionalJwtAuthGuard,
    PermissionGuard,
    RoleGuard,
    RateLimitGuard,
  ],
})
export class GuardsModule {}
