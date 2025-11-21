import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfrastructureEnvSchema } from './InfrastructureEnvSchema.schema';
import { AppConfig } from './AppConfig.service';
import { IAppConfig } from '@shared/tokens/injection.tokens';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: InfrastructureEnvSchema,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  providers: [
    {
      provide: IAppConfig,
      useClass: AppConfig,
    },
  ],
  exports: [IAppConfig],
})
export class InfrastructureConfigModule {}
