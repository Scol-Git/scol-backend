// src/APP.Infrastructure/db/typeorm/migration.config.ts
import 'reflect-metadata';
import { DataSource as DbContext } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { config as dotenvConfig } from 'dotenv';

// ---------------------------
// 1. Resolve project root safely
// ---------------------------
const projectRoot = path.resolve(__dirname, '../../../..');

// ---------------------------
// 2. Load .env.local first, fallback to .env
// ---------------------------
const envLocalPath = path.join(projectRoot, '.env.local');
const envPath = path.join(projectRoot, '.env');

if (fs.existsSync(envLocalPath)) {
  dotenvConfig({ path: envLocalPath });
} else if (fs.existsSync(envPath)) {
  dotenvConfig({ path: envPath });
} else {
  console.warn(
    'No .env.local or .env found at project root; relying on process.env',
  );
}

// ---------------------------
// 3. Validate required env vars
// ---------------------------
if (!process.env.DATABASE_URL) {
  throw new Error(
    '❌ DATABASE_URL is missing. Put it inside .env.local or .env at project root.',
  );
}

const dbUrl = process.env.DATABASE_URL;

// ---------------------------
// 4. Determine migration path based on mode
// ---------------------------
// ts-node -> use .ts
// prod build -> use dist .js
const isTs = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';
const migrationPath = isTs
  ? path.join(projectRoot, 'migrations', '*.ts')
  : path.join(projectRoot, 'dist', 'migrations', '*.js');

// ---------------------------
// 5. Import entities (manual or glob)
// ---------------------------
import { SysCountries } from '@entity/entities/SysCountries.entity';

export default new DbContext({
  type: 'postgres',
  url: dbUrl,
  synchronize: false,
  logging: false,

  entities: [SysCountries],

  migrations: [migrationPath],

  // ssl: true, // usually not needed if ?sslmode=require is in the URL
});
