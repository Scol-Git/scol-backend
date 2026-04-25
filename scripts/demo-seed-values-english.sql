-- Update required fields in sys_EnglishTests
UPDATE "sys_EnglishTests"
SET "maxScore" = CASE "testName"
                    WHEN 'TOEFL' THEN 120.00
                    WHEN 'PTE' THEN 90.00
                    WHEN 'IELTS' THEN 9.00
END,
"updatedAt" = NOW()
WHERE "testName" IN ('TOEFL', 'PTE', 'IELTS');


-- Insert sys_EnglishTestSections
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
    ('TOEFL', 'Reading',   30.00),
    ('TOEFL', 'Listening', 30.00),
    ('TOEFL', 'Speaking',  30.00),
    ('TOEFL', 'Writing',   30.00),

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
