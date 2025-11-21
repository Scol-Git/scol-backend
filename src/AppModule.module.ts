import { Module } from '@nestjs/common';
import { ApiModule } from '@api/ApiModule.module';

// Import @Global modules ONCE at root - they're available everywhere
import { LoggingModule } from '@infra/logging/LoggingModule.module';
import { SecurityModule } from '@infra/security/SecurityModule.module';
import { MappingModule } from '@bll/mappings/MappingModule.module';
import { TypeOrmModule } from '@infra/db/typeorm/TypeOrmModule.module';
import { AppConfigModule } from '@infra/config/AppConfigModule.module';

/**
 * Root Application Module
 *
 * Imports @Global modules once at root level - they're automatically available everywhere.
 * Imports ApiModule which contains all feature modules.
 */
@Module({
  imports: [
    // @Global modules - imported once, available everywhere
    AppConfigModule, // Provides IInfrastructureConfig, IApplicationConfig, ISecurityConfig, IApiConfig
    LoggingModule, // Provides ILogger
    SecurityModule, // Provides IJwtService, IPasswordHasher
    MappingModule, // Provides IMapper
    TypeOrmModule, // Provides DbContext (via @InjectDataSource())

    // Application module
    ApiModule,
  ],
})
export class AppModule {}
