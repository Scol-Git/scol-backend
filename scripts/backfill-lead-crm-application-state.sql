-- Backfill LeadCrmInfos application/enrollment state from existing data.
-- Idempotent: safe to re-run; only fills missing or incorrect flags.
--
-- Usage:
--   1. Run the PREVIEW queries below and review counts.
--   2. Uncomment BEGIN/COMMIT and run the UPDATE block in a transaction.
--   3. Run the VERIFICATION queries and confirm before COMMIT.

-- ======================================================
-- PREVIEW: rows that will change
-- ======================================================

-- Leads with applications but hasAnyApplication is not true
SELECT COUNT(*) AS leads_missing_has_any_application
FROM "LeadCrmInfos" crm
WHERE COALESCE(crm."hasAnyApplication", false) = false
  AND EXISTS (
    SELECT 1
    FROM "Applications" app
    WHERE app."leadId" = crm."leadId"
      AND app."deletedAt" IS NULL
  );

-- Leads without applications but hasAnyApplication is true
SELECT COUNT(*) AS leads_incorrect_has_any_application
FROM "LeadCrmInfos" crm
WHERE crm."hasAnyApplication" = true
  AND NOT EXISTS (
    SELECT 1
    FROM "Applications" app
    WHERE app."leadId" = crm."leadId"
      AND app."deletedAt" IS NULL
  );

-- Leads missing enrollmentDate but have an ENROLLED stage-change activity
WITH first_enrollment AS (
  SELECT
    app."leadId",
    MIN(aa."createdAt")::date AS "enrollmentDate"
  FROM "ApplicationActivities" aa
  INNER JOIN "Applications" app ON app."id" = aa."applicationId"
  WHERE aa."deletedAt" IS NULL
    AND app."deletedAt" IS NULL
    AND aa."activityType" = 'STAGE_CHANGED'
    AND UPPER(COALESCE(aa."toValue", '')) = 'ENROLLED'
  GROUP BY app."leadId"
)
SELECT COUNT(*) AS leads_missing_enrollment_date
FROM "LeadCrmInfos" crm
INNER JOIN first_enrollment fe ON fe."leadId" = crm."leadId"
WHERE crm."enrollmentDate" IS NULL;

-- Leads with enrollmentDate but missing enrollmentStatus
SELECT COUNT(*) AS leads_missing_enrollment_status
FROM "LeadCrmInfos" crm
WHERE crm."enrollmentDate" IS NOT NULL
  AND crm."enrollmentStatus" IS NULL;

-- ======================================================
-- BACKFILL (wrap in transaction before running)
-- ======================================================

-- BEGIN;

-- 1) Set hasAnyApplication = true where applications exist
UPDATE "LeadCrmInfos" crm
SET
  "hasAnyApplication" = true,
  "updatedAt" = NOW()
WHERE COALESCE(crm."hasAnyApplication", false) = false
  AND EXISTS (
    SELECT 1
    FROM "Applications" app
    WHERE app."leadId" = crm."leadId"
      AND app."deletedAt" IS NULL
  );

-- 2) Normalize hasAnyApplication = false where no applications exist
UPDATE "LeadCrmInfos" crm
SET
  "hasAnyApplication" = false,
  "updatedAt" = NOW()
WHERE crm."hasAnyApplication" IS DISTINCT FROM false
  AND NOT EXISTS (
    SELECT 1
    FROM "Applications" app
    WHERE app."leadId" = crm."leadId"
      AND app."deletedAt" IS NULL
  );

-- 3) Derive first enrollmentDate from earliest ENROLLED stage-change activity
WITH first_enrollment AS (
  SELECT
    app."leadId",
    MIN(aa."createdAt")::date AS "enrollmentDate"
  FROM "ApplicationActivities" aa
  INNER JOIN "Applications" app ON app."id" = aa."applicationId"
  WHERE aa."deletedAt" IS NULL
    AND app."deletedAt" IS NULL
    AND aa."activityType" = 'STAGE_CHANGED'
    AND UPPER(COALESCE(aa."toValue", '')) = 'ENROLLED'
  GROUP BY app."leadId"
)
UPDATE "LeadCrmInfos" crm
SET
  "enrollmentDate" = fe."enrollmentDate",
  "updatedAt" = NOW()
FROM first_enrollment fe
WHERE fe."leadId" = crm."leadId"
  AND crm."enrollmentDate" IS NULL;

-- 4) Default enrollmentStatus to Online when enrollmentDate exists
UPDATE "LeadCrmInfos" crm
SET
  "enrollmentStatus" = 'Online',
  "updatedAt" = NOW()
WHERE crm."enrollmentDate" IS NOT NULL
  AND crm."enrollmentStatus" IS NULL;

-- COMMIT;

-- ======================================================
-- VERIFICATION (run after UPDATE, before COMMIT)
-- ======================================================

SELECT
  COUNT(*) FILTER (WHERE COALESCE("hasAnyApplication", false) = true) AS has_any_application_true,
  COUNT(*) FILTER (WHERE COALESCE("hasAnyApplication", false) = false) AS has_any_application_false,
  COUNT(*) FILTER (WHERE "enrollmentDate" IS NOT NULL) AS with_enrollment_date,
  COUNT(*) FILTER (WHERE "enrollmentStatus" IS NOT NULL) AS with_enrollment_status
FROM "LeadCrmInfos"
WHERE "deletedAt" IS NULL;

-- Remaining mismatches (should be 0 for application flag consistency)
SELECT COUNT(*) AS remaining_has_any_application_mismatch
FROM "LeadCrmInfos" crm
WHERE (
    COALESCE(crm."hasAnyApplication", false) = true
    AND NOT EXISTS (
      SELECT 1
      FROM "Applications" app
      WHERE app."leadId" = crm."leadId"
        AND app."deletedAt" IS NULL
    )
  )
  OR (
    COALESCE(crm."hasAnyApplication", false) = false
    AND EXISTS (
      SELECT 1
      FROM "Applications" app
      WHERE app."leadId" = crm."leadId"
        AND app."deletedAt" IS NULL
    )
  );

-- Remaining enrollment status gaps (should be 0 when enrollmentDate is set)
SELECT COUNT(*) AS remaining_missing_enrollment_status
FROM "LeadCrmInfos" crm
WHERE crm."enrollmentDate" IS NOT NULL
  AND crm."enrollmentStatus" IS NULL;
