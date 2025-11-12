// src/APP.Infrastructure/db/typeorm/migration.config.ts
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { config as dotenvConfig } from 'dotenv';

// --- Load env from root: prefer .env.local, fallback to .env ---
const root = process.cwd();
const envLocal = path.join(root, '.env.local');
const envDefault = path.join(root, '.env');

if (fs.existsSync(envLocal)) {
  dotenvConfig({ path: envLocal });
} else if (fs.existsSync(envDefault)) {
  dotenvConfig({ path: envDefault });
} else {
  console.warn(
    'No .env.local or .env found at project root; relying on process.env',
  );
}

// --- Entities (via path aliases) ---
import { Organization } from '@entity/entities/Organization.entity';
import { User } from '@entity/entities/User.entity';
import { Project } from '@entity/entities/Project.entity';
import { Todo } from '@entity/entities/Todo.entity';
import { TodoDependency } from '@entity/entities/TodoDependency.entity';
import { AuditEvent } from '@entity/entities/AuditEvent.entity';

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error(
    'DATABASE_URL is not set. Put it in .env.local (or .env) at project root.',
  );
}

console.log('TypeORM CLI using DATABASE_URL:', url);

export default new DataSource({
  type: 'postgres',
  url,
  entities: [Organization, User, Project, Todo, TodoDependency, AuditEvent],
  migrations: ['migrations/*{.ts,.js}'],
  synchronize: false,
  logging: false,
  // ssl: true, // usually not needed if ?sslmode=require is in the URL
});
