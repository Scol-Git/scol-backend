import { Module } from '@nestjs/common';
import { ApiModule } from '@api/ApiModule.module';

// Import @Global modules ONCE at root - they're available everywhere
import { LoggingModule } from '@infra/logging/LoggingModule.module';
import { SecurityModule } from '@infra/security/SecurityModule.module';
import { MappingModule } from '@bll/mappings/MappingModule.module';
import { TypeOrmModule } from '@infra/db/typeorm/TypeOrmModule.module';
import { AppConfigModule } from '@infra/config/AppConfigModule.module';
import { CacheModule } from '@infra/cache/CacheModule.module';
import { RateLimitingModule } from '@infra/rate-limiting/RateLimitingModule.module';

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
    CacheModule, // Provides ICacheService (Redis + in-memory fallback)
    RateLimitingModule, // Provides IRateLimitingStorage (Redis + in-memory fallback)

    // Application module
    ApiModule,
  ],
})
export class AppModule {}
