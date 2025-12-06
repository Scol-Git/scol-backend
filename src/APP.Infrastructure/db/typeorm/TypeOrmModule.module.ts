import { Global, Module } from '@nestjs/common';
import { TypeOrmModule as NestTypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import type { IInfrastructureConfig } from '@shared/interfaces/config/IInfrastructureConfig.interface';
import { IInfrastructureConfig as IInfrastructureConfigToken } from '@shared/tokens/injection.tokens';

// Import QueryBuilder extension methods to register them globally
import '../extensions/QueryBuilderExtensions';

// Import entities
import { SysCountries } from '@entity/entities/SysCountries.entity';

@Global()
@Module({
  imports: [
    NestTypeOrmModule.forRootAsync({
      inject: [IInfrastructureConfigToken, ConfigService],
      useFactory: (
        config: IInfrastructureConfig,
        cfg: ConfigService,
      ): DataSourceOptions => {
        const url = config.database.url;
        const base: DataSourceOptions = url
          ? { type: 'postgres', url }
          : {
              type: 'postgres',
              host: config.database.host,
              port: config.database.port,
              username: config.database.username,
              password: config.database.password,
              database: config.database.database,
            };

        return {
          ...base,
          entities: [
            SysCountries,
          ],
          synchronize: false,
          logging:
            cfg.get('NODE_ENV') === 'development'
              ? ['error', 'warn']
              : ['error'],
        };
      },
    }),

    NestTypeOrmModule.forFeature([
      SysCountries,
    ]),
  ],
  exports: [NestTypeOrmModule],
})
export class TypeOrmModule {}
