import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

// Common modules
import { GuardsModule } from './common/guards/GuardsModule.module';
import { HttpExceptionFilter } from './common/filters/HttpExceptionFilter.filter';
import { RequestLoggingMiddleware } from './common/middleware/RequestLoggingMiddleware';

// Feature modules


import { AuthModule } from './feature-controllers/auth/AuthModule.module';
import { HealthCheckModule } from './feature-controllers/health-check/HealthCheckModule.module';

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
    GuardsModule, // Provides JwtAuthGuard, PermissionGuard, RoleGuard, RateLimitGuard globally

    // Feature modules
    AuthModule,
    HealthCheckModule,
  ],
  providers: [HttpExceptionFilter, RequestLoggingMiddleware],
})
export class ApiModule implements NestModule {
  /**
   * Configure middleware for the API module.
   * Registers request logging and user context middleware globally.
   */
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes('*');
  }
}
