import { Global, Module } from '@nestjs/common';
import { TypeOrmModule as NestTypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import type { IInfrastructureConfig } from '@shared/interfaces/config/IInfrastructureConfig.interface';
import { IInfrastructureConfig as IInfrastructureConfigToken } from '@shared/tokens/injection.tokens';

// Import QueryBuilder extension methods to register them globally
import '../extensions/QueryBuilderExtensions';

import { Organization } from '@entity/entities/Organization.entity';
import { User } from '@entity/entities/User.entity';
import { Project } from '@entity/entities/Project.entity';
import { Todo } from '@entity/entities/Todo.entity';
import { TodoDependency } from '@entity/entities/TodoDependency.entity';
import { AuditEvent } from '@entity/entities/AuditEvent.entity';
import { Role } from '@entity/entities/Role.entity';
import { Permission } from '@entity/entities/Permission.entity';
import { UserRole } from '@entity/entities/UserRole.entity';
import { RolePermission } from '@entity/entities/RolePermission.entity';
import { ExternalAuthProvider } from '@entity/entities/ExternalAuthProvider.entity';
import { RefreshToken } from '@entity/entities/RefreshToken.entity';

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
            Organization,
            User,
            Project,
            Todo,
            TodoDependency,
            AuditEvent,
            Role,
            Permission,
            UserRole,
            RolePermission,
            ExternalAuthProvider,
            RefreshToken,
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
      Organization,
      User,
      Project,
      Todo,
      TodoDependency,
      AuditEvent,
      Role,
      Permission,
      UserRole,
      ExternalAuthProvider,
      RefreshToken,
    ]),
  ],
  exports: [NestTypeOrmModule],
})
export class TypeOrmModule {}
