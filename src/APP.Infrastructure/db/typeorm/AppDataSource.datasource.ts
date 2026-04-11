// src/APP.Infrastructure/db/typeorm/DbContext.datasource.ts
// AppDataSource - TypeORM DataSource for migrations and CLI operations
// This is separate from AppDbContext (runtime Nest provider)
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as path from 'path';
import * as fs from 'fs';
import { config as dotenvConfig } from 'dotenv';
import { getAppStage } from '@infra/config/getAppStage';

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
// ts-node -> use .ts (dev)
// prod build -> use dist .js (qa/prod)
const isTs = getAppStage() === 'dev';
const migrationPath = isTs
  ? path.join(projectRoot, 'migrations', '*.ts')
  : path.join(projectRoot, 'dist', 'migrations', '*.js');

// ---------------------------
// 5. Import entities (manual or glob)
// ---------------------------
import { SysCountries } from '@entity/entities/SysCountries.entity';
import { SysAcademicDegrees } from '@entity/entities/SysAcademicDegrees.entity';
import { SysEnglishTests } from '@entity/entities/SysEnglishTests.entity';
import { SysProgrammes } from '@entity/entities/SysProgrammes.entity';
import { SysPermissions } from '@entity/entities/SysPermissions.entity';
import { SysRoles } from '@entity/entities/SysRoles.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { LeadAcademicResults } from '@entity/entities/LeadAcademicResults.entity';
import { LeadTestResults } from '@entity/entities/LeadTestResults.entity';
import { LeadPreferredCountries } from '@entity/entities/LeadPreferredCountries.entity';
import { LeadPreferredPrograms } from '@entity/entities/LeadPreferredPrograms.entity';
import { UserSessions } from '@entity/entities/UserSessions.entity';
import { UserPermissions } from '@entity/entities/UserPermissions.entity';
import { UserRoles } from '@entity/entities/UserRoles.entity';
import { OtpSession } from '@entity/entities/OtpSession.entity';
// New entities
import { SysStates } from '@entity/entities/SysStates.entity';
import { SysCities } from '@entity/entities/SysCities.entity';
import { SysEnglishTestSections } from '@entity/entities/SysEnglishTestSections.entity';
import { LeadEnglishTestResults } from '@entity/entities/LeadEnglishTestResults.entity';
import { LeadEnglishTestSectionResults } from '@entity/entities/LeadEnglishTestSectionResults.entity';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { UniCourses } from '@entity/entities/UniCourses.entity';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { CourseIntakeScholarships } from '@entity/entities/CourseIntakeScholarships.entity';
import { UniAcademicReq } from '@entity/entities/UniAcademicReq.entity';
import { UniEngReq } from '@entity/entities/UniEngReq.entity';
import { CourseEngReq } from '@entity/entities/CourseEngReq.entity';
import { SysDocumentTypes } from '@entity/entities/SysDocumentTypes.entity';
import { SysApplicationStage } from '@entity/entities/SysApplicationStage.entity';
import { SysApplicationStatus } from '@entity/entities/SysApplicationStatus.entity';
import { SysApplicationStage2Status } from '@entity/entities/SysApplicationStage2Status.entity';
import { Applications } from '@entity/entities/Applications.entity';
import { CourseRequiredDocuments } from '@entity/entities/CourseRequiredDocuments.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import { ApplicationDocumentVersions } from '@entity/entities/ApplicationDocumentVersions.entity';
import { ApplicationStatusHistory } from '@entity/entities/ApplicationStatusHistory.entity';
import { ApplicationStageHistory } from '@entity/entities/ApplicationStageHistory.entity';
import { LeadDocuments } from '@entity/entities/LeadDocuments.entity';
import { LeadDocumentVersions } from '@entity/entities/LeadDocumentVersions.entity';

/**
 * AppDataSource - TypeORM DataSource for migrations and CLI operations
 * Use this for:
 * - Running migrations (npm run migration:run)
 * - Generating migrations (npm run migration:generate)
 * - CLI operations
 *
 * For runtime dependency injection in services, use AppDbContext instead
 */
const AppDataSource = new DataSource({
  type: 'postgres',
  url: dbUrl,
  synchronize: false,
  logging: false,

  entities: [
    SysCountries,
    SysAcademicDegrees,
    SysEnglishTests,
    SysProgrammes,
    SysPermissions,
    SysRoles,
    SysLeadProfiles,
    SysUsers,
    LeadAcademicResults,
    LeadTestResults,
    LeadPreferredCountries,
    LeadPreferredPrograms,
    UserSessions,
    UserPermissions,
    UserRoles,
    OtpSession,
    // New entities
    SysStates,
    SysCities,
    SysEnglishTestSections,
    LeadEnglishTestResults,
    LeadEnglishTestSectionResults,
    SysUniversities,
    UniCourses,
    UniCourseIntakes,
    CourseIntakeScholarships,
    UniAcademicReq,
    UniEngReq,
    CourseEngReq,
    SysDocumentTypes,
    SysApplicationStage,
    SysApplicationStatus,
    SysApplicationStage2Status,
    Applications,
    CourseRequiredDocuments,
    ApplicationRequiredDocuments,
    ApplicationDocuments,
    ApplicationDocumentVersions,
    ApplicationStatusHistory,
    ApplicationStageHistory,
    LeadDocuments,
    LeadDocumentVersions,
  ],

  migrations: [migrationPath],

  // ssl: true, // usually not needed if ?sslmode=require is in the URL
});

// Export as default for TypeORM CLI compatibility (required by TypeORM CLI)
export default AppDataSource;
