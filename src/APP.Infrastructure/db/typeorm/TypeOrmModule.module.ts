import { Global, Module } from '@nestjs/common';
import { TypeOrmModule as NestTypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

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
      inject: [ConfigService],
      useFactory: (cfg: ConfigService): DataSourceOptions => {
        const url = cfg.get<string>('DATABASE_URL');
        const base: DataSourceOptions = url
          ? { type: 'postgres', url }
          : {
              type: 'postgres',
              host: cfg.get<string>('DB_HOST'),
              port: cfg.get<number>('DB_PORT'),
              username: cfg.get<string>('DB_USER'),
              password: cfg.get<string>('DB_PASS'),
              database: cfg.get<string>('DB_NAME'),
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
