import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppEnvSchema } from './AppEnvSchema.schema';
import storageConfig from './storage.config';
import { InfrastructureConfig } from './layer-configs/InfrastructureConfig.service';
import { ApplicationConfig } from './layer-configs/ApplicationConfig.service';
import { SecurityConfig } from './layer-configs/SecurityConfig.service';
import { ApiConfig } from './layer-configs/ApiConfig.service';
import { JobConfig } from './layer-configs/JobConfig.service';
import {
  IInfrastructureConfig,
  IApplicationConfig,
  ISecurityConfig,
  IApiConfig,
  IJobConfig,
} from '@shared/tokens/injection.tokens';

/**
 * Infrastructure Configuration Module
 *
 * Global module that provides layer-wise configuration services.
 * Validates all environment variables at startup using Joi schema.
 *
 * Provides:
 * - IInfrastructureConfig: Database, email, cache, messaging
 * - IApplicationConfig: Auth, pagination, business rules
 * - ISecurityConfig: JWT, OAuth
 * - IApiConfig: CORS, rate limiting
 * - IJobConfig: Cron schedules, job enable flag
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: AppEnvSchema,
      envFilePath: ['.env.local', '.env'],
      load: [storageConfig],
    }),
  ],
  providers: [
    {
      provide: IInfrastructureConfig,
      useClass: InfrastructureConfig,
    },
    {
      provide: IApplicationConfig,
      useClass: ApplicationConfig,
    },
    {
      provide: ISecurityConfig,
      useClass: SecurityConfig,
    },
    {
      provide: IApiConfig,
      useClass: ApiConfig,
    },
    {
      provide: IJobConfig,
      useClass: JobConfig,
    },
  ],
  exports: [
    IInfrastructureConfig,
    IApplicationConfig,
    ISecurityConfig,
    IApiConfig,
    IJobConfig,
  ],
})
export class AppConfigModule {}
