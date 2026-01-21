import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

// Common modules
import { GuardsModule } from './common/guards/GuardsModule.module';
import { HttpExceptionFilter } from './common/filters/HttpExceptionFilter.filter';
import { RequestLoggingMiddleware } from './common/middleware/RequestLoggingMiddleware';

// Feature modules
import { AuthModule } from './feature-controllers/auth/AuthModule.module';
import { DemoModule } from './feature-controllers/demo/DemoModule.module';

// Standalone controllers
import { HealthController } from './feature-controllers/health/HealthController.controller';
import { InternalCronController } from './feature-controllers/internal/InternalCronController.controller';

// BLL modules for controller dependencies
import { AuthModule as AuthBllModule } from '@bll/services/auth/AuthModule.module';
import { HealthCheckModule } from '@bll/services/health/HealthCheckModule.module';

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
    DemoModule, // Demo endpoints for entity relationships

    // BLL modules for standalone controllers
    AuthBllModule, // For InternalCronController
    HealthCheckModule, // For HealthController
  ],
  controllers: [
    HealthController,
    InternalCronController,
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
