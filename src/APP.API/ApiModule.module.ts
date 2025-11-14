import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';

import { OrganizationController } from './controllers/OrganizationController.controller';
import { HealthController } from './controllers/HealthController.controller';

import { OrganizationService } from '@bll/services/OrganizationService.service';
import { IOrganizationService } from '@shared/tokens/injection.tokens';

import { HttpExceptionFilter } from './filters/HttpExceptionFilter.filter';
import { UserContextMiddleware } from './middleware/UserContextMiddleware';
import { RequestLoggingMiddleware } from './middleware/RequestLoggingMiddleware';
import { InfrastructureModule } from '@infra/InfrastructureModule.module';
import { MappingModule } from '@bll/mappings/MappingModule.module';

/**
 * API Module - Entry point for the REST API layer.
 *
 * Registers controllers, services, and middleware.
 * Uses interface-based DI following .NET's approach of programming to interfaces.
 */
@Module({
  imports: [
    InfrastructureModule, // ✅ registers DataSource + Logger (global)
    MappingModule, // ✅ registers MAPPER + OrganizationMapper (global)
  ],
  controllers: [OrganizationController, HealthController],
  providers: [
    // Register OrganizationService with interface token (following .NET DI pattern)
    {
      provide: IOrganizationService,
      useClass: OrganizationService,
    },
    HttpExceptionFilter,
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
