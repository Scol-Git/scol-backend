-- Run BEFORE the bulk-import migrations. Must return 0 rows.
-- Any row returned = duplicate natural key that must be merged by a human first.
SELECT 'sys_Countries' AS t, lower(trim("countryName")) AS k, count(*) FROM "sys_Countries" WHERE "deletedAt" IS NULL GROUP BY 2 HAVING count(*) > 1
UNION ALL
SELECT 'sys_States', "sysCountryId"::text || '|' || lower(trim("stateName")), count(*) FROM "sys_States" WHERE "deletedAt" IS NULL GROUP BY 2 HAVING count(*) > 1
UNION ALL
SELECT 'sys_Cities', "sysStateId"::text || '|' || lower(trim("cityName")), count(*) FROM "sys_Cities" WHERE "deletedAt" IS NULL GROUP BY 2 HAVING count(*) > 1
UNION ALL
SELECT 'sys_Programmes', lower(trim("name")), count(*) FROM "sys_Programmes" WHERE "deletedAt" IS NULL GROUP BY 2 HAVING count(*) > 1
UNION ALL
SELECT 'sys_Universities', lower(trim("uniName")), count(*) FROM "sys_Universities" WHERE "deletedAt" IS NULL GROUP BY 2 HAVING count(*) > 1
UNION ALL
SELECT 'UniCourses', "uniId"::text || '|' || lower(trim("courseName")) || '|' || "sysDegreeId"::text, count(*) FROM "UniCourses" WHERE "deletedAt" IS NULL GROUP BY 2 HAVING count(*) > 1
UNION ALL
SELECT 'UniCourseIntakes', "uniCourseId"::text || '|' || "intakeYear" || '|' || "intakeMonth", count(*) FROM "UniCourseIntakes" WHERE "deletedAt" IS NULL GROUP BY 2 HAVING count(*) > 1;
