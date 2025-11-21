import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

// Feature modules
import { OrganizationModule } from './feature-controllers/organizations/OrganizationModule.module';
import { AuthModule } from './feature-controllers/auth/AuthModule.module';
import { NotificationModule } from './feature-controllers/notifications/NotificationModule.module';
import { HealthCheckModule } from './feature-controllers/health-check/HealthCheckModule.module';

// Non-global modules (only where needed)
import { MessagingModule } from '@infra/messaging/MessagingModule.module'; // Used by NotificationModule

// Common modules
import { GuardsModule } from './common/guards/GuardsModule.module';

// Common middleware & filters
import { HttpExceptionFilter } from './common/filters/HttpExceptionFilter.filter';
import { UserContextMiddleware } from './common/middleware/UserContextMiddleware';
import { RequestLoggingMiddleware } from './common/middleware/RequestLoggingMiddleware';

/**
 * API Module - Entry point for the REST API layer.
 *
 * Registers feature modules, common controllers, middleware, and filters.
 * Uses interface-based DI following .NET's approach of programming to interfaces.
 *
 * Note: @Global modules (LoggingModule, SecurityModule, MappingModule, TypeOrmModule)
 * are imported in AppModule and available everywhere automatically.
 */
@Module({
  imports: [
    // Global common modules
    GuardsModule, // Provides JwtAuthGuard, PermissionGuard, RoleGuard globally

    // Feature modules
    OrganizationModule,
    AuthModule,
    NotificationModule,
    HealthCheckModule,

    // Non-global modules (only where needed)
    MessagingModule, // Used by NotificationModule
  ],
  providers: [
    HttpExceptionFilter,
    RequestLoggingMiddleware,
    UserContextMiddleware,
  ],
})
export class ApiModule implements NestModule {
  /**
   * Configure middleware for the API module.
   * Registers request logging and user context middleware globally.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggingMiddleware, UserContextMiddleware)
      .forRoutes('*');
  }
}
