import { Module } from '@nestjs/common';
import { ApiModule } from '@api/ApiModule.module';
import { JobModule } from '@job/JobModule.module';

// Import @Global modules ONCE at root - they're available everywhere
import { LoggingModule } from '@infra/logging/LoggingModule.module';
import { SecurityModule } from '@infra/security/SecurityModule.module';
import { MappingModule } from '@bll/mappings/MappingModule.module';
import { TypeOrmModule } from '@infra/db/typeorm/TypeOrmModule.module';
import { AppConfigModule } from '@infra/config/AppConfigModule.module';
import { CacheModule } from '@infra/redis/cache/CacheModule.module';
import { RateLimitingModule } from '@infra/redis/rate-limiting/RateLimitingModule.module';

/**
 * Root Application Module
 *
 * Imports @Global modules once at root level - they're automatically available everywhere.
 * Imports ApiModule which contains all feature modules.
 * Imports JobModule for cron scheduling (APP.JOB).
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

    // Application modules
    ApiModule,
    JobModule,
  ],
})
export class AppModule {}
