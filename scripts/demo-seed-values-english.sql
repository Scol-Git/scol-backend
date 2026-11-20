-- Update required fields in sys_EnglishTests
UPDATE "sys_EnglishTests"
SET "maxScore" = CASE "testName"
                    WHEN 'TOEFL' THEN 6.00
                    WHEN 'PTE' THEN 90.00
                    WHEN 'IELTS' THEN 9.00
END,
"updatedAt" = NOW()
WHERE "testName" IN ('TOEFL', 'PTE', 'IELTS');

-- Existing TOEFL sections stay on this test. Only the cap changes.
UPDATE "sys_EnglishTestSections" sec
SET "maxScore" = 6.00,
    "updatedAt" = NOW()
FROM "sys_EnglishTests" t
WHERE sec."testId" = t."id"
  AND t."testName" = 'TOEFL'
  AND sec."sectionName" IN ('Reading', 'Listening', 'Speaking', 'Writing')
  AND sec."deletedAt" IS NULL;


-- Insert sys_EnglishTestSections that are not already present
INSERT INTO "sys_EnglishTestSections"
(
  "id",
  "createdAt",
  "updatedAt",
  "deletedAt",
  "testId",
  "sectionName",
  "maxScore"
)
SELECT
  gen_random_uuid(),
  NOW(),
  NOW(),
  NULL,
  t."id",
  s."sectionName",
  s."maxScore"
FROM "sys_EnglishTests" t
JOIN (
  VALUES
    ('TOEFL', 'Reading',   6.00),
    ('TOEFL', 'Listening', 6.00),
    ('TOEFL', 'Speaking',  6.00),
    ('TOEFL', 'Writing',   6.00),

    ('PTE', 'Reading',     90.00),
    ('PTE', 'Listening',   90.00),
    ('PTE', 'Speaking',    90.00),
    ('PTE', 'Writing',     90.00),

    ('IELTS', 'Reading',   9.00),
    ('IELTS', 'Listening', 9.00),
    ('IELTS', 'Speaking',  9.00),
    ('IELTS', 'Writing',   9.00)
) AS s("testName", "sectionName", "maxScore")
ON t."testName" = s."testName"
WHERE t."deletedAt" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "sys_EnglishTestSections" existing
    WHERE existing."testId" = t."id"
      AND existing."sectionName" = s."sectionName"
      AND existing."deletedAt" IS NULL
  )
