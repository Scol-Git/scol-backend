import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';

// Entities
import { Organization } from '@entity/entities/Organization.entity';
import { User } from '@entity/entities/User.entity';
import { Project } from '@entity/entities/Project.entity';
import { Todo } from '@entity/entities/Todo.entity';
import { TodoDependency } from '@entity/entities/TodoDependency.entity';
import { AuditEvent } from '@entity/entities/AuditEvent.entity';

// Optional snake_case naming
// import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
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
          // Entities explicitly listed (good for libs/monorepos)
          entities: [
            Organization,
            User,
            Project,
            Todo,
            TodoDependency,
            AuditEvent,
          ],
          // namingStrategy: new SnakeNamingStrategy(),

          // Keep off in prod — use migrations
          synchronize: false,

          // Reasonable defaults
          logging:
            cfg.get('NODE_ENV') === 'development'
              ? ['error', 'warn']
              : ['error'],
          // TypeORM pool via PG defaults; tune via env if needed:
          // extra: { max: 10, statement_timeout: 15000, idle_in_transaction_session_timeout: 15000 },

          // Optional SSL for managed Postgres
          // ssl: cfg.get('NODE_ENV') === 'production' ? { rejectUnauthorized: false } : false,
        };
      },
    }),

    // If you ever want DI repositories; otherwise inject DataSource/EntityManager directly
    TypeOrmModule.forFeature([
      Organization,
      User,
      Project,
      Todo,
      TodoDependency,
      AuditEvent,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class TypeOrmDbModule {}
