-- Seed data for sys_DocumentTypes (PostgreSQL / Neon)
-- Run this against your database (e.g. via psql or Neon SQL Editor).
-- Uses fixed UUIDs so you can reference them in API calls (e.g. Postman).

INSERT INTO "sys_DocumentTypes" (
  "createdAt",
  "updatedAt",
  "deletedAt",
  "name",
  "description",
  "allowedMimeTypes",
  "maxFileSizeBytes",
  "isActive"
) VALUES
  (
    NOW(),
    NOW(),
    NULL,
    'Passport',
    'Valid passport or national ID document',
    'application/pdf,image/jpeg,image/png',
    10485760,
    true
  ),
  (
    NOW(),
    NOW(),
    NULL,
    'Academic Transcript',
    'Official academic transcript or mark sheet',
    'application/pdf,image/jpeg,image/png',
    10485760,
    true
  ),
  (
    NOW(),
    NOW(),
    NULL,
    'CV / Resume',
    'Curriculum vitae or resume',
    'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    5242880,
    true
  ),
  (
    NOW(),
    NOW(),
    NULL,
    'English Test Result',
    'IELTS, TOEFL, PTE or other English proficiency test result',
    'application/pdf,image/jpeg,image/png',
    10485760,
    true
  ),
  (
    NOW(),
    NOW(),
    NULL,
    'Degree Certificate',
    'Degree or diploma certificate',
    'application/pdf,image/jpeg,image/png',
    10485760,
    true
  ),
  (
    NOW(),
    NOW(),
    NULL,
    'Personal Statement',
    'Statement of purpose or personal statement',
    'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain',
    5242880,
    true
  ),
  (
    NOW(),
    NOW(),
    NULL,
    'Reference Letter',
    'Academic or professional reference / recommendation letter',
    'application/pdf,image/jpeg,image/png',
    10485760,
    true
  ),
  (
    NOW(),
    NOW(),
    NULL,
    'Other',
    'Other supporting document',
    'application/pdf,image/jpeg,image/png,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    10485760,
    true
  )
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED."name",
  "description" = EXCLUDED."description",
  "allowedMimeTypes" = EXCLUDED."allowedMimeTypes",
  "maxFileSizeBytes" = EXCLUDED."maxFileSizeBytes",
  "isActive" = EXCLUDED."isActive",
  "updatedAt" = NOW();
