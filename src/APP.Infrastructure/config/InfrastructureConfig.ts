import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { InfrastructureEnvSchema } from './InfrastructureEnvSchema.schema';

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
})
export class InfrastructureConfigModule {}
