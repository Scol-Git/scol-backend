# Useful SQL to debug

## Intake Infos

### How many unique intake months and years are there?

#### For each University
```sql
SELECT
    uni."id"                           AS university_id,
    uni."uniName"                          AS university_name,

    COUNT(DISTINCT si."intakeMonth")   AS distinct_intake_months,
    COUNT(DISTINCT uci."intakeYear")   AS distinct_intake_years,
    COUNT(DISTINCT uci."uniCourseId")  AS distinct_courses,

    COUNT(*)                           AS total_course_intakes,

    ARRAY_AGG(DISTINCT si."intakeMonth" ORDER BY si."intakeMonth")
        AS distinct_intake_month_names,

    ARRAY_AGG(DISTINCT uci."intakeYear" ORDER BY uci."intakeYear")
        AS distinct_intake_year_names

FROM "UniCourseIntakes" uci
JOIN "UniIntakes" ui
    ON uci."uniIntakeId" = ui."id"
JOIN "sys_Intakes" si
    ON ui."sysIntakeId" = si."id"
JOIN "sys_Universities" uni
    ON ui."uniId" = uni."id"
GROUP BY uni."id"

ORDER BY uni."id";
```

#### For each Course
```sql
SELECT
    course."id"                         AS course_id,
    course."courseName"                 AS course_name,
    uni."id"                            AS university_id,
    uni."uniName"                       AS university_name,

    COUNT(DISTINCT si."intakeMonth")    AS distinct_intake_months,
    COUNT(DISTINCT uci."intakeYear")    AS distinct_intake_years,

    COUNT(*)                            AS total_course_intakes,

    ARRAY_AGG(DISTINCT si."intakeMonth" ORDER BY si."intakeMonth")
        AS distinct_intake_month_names,

    ARRAY_AGG(DISTINCT uci."intakeYear" ORDER BY uci."intakeYear")
        AS distinct_intake_year_names

FROM "UniCourseIntakes" uci

JOIN "UniCourses" course
    ON uci."uniCourseId" = course."id"

JOIN "sys_Universities" uni
    ON course."uniId" = uni."id"

JOIN "UniIntakes" ui
    ON uci."uniIntakeId" = ui."id"

JOIN "sys_Intakes" si
    ON ui."sysIntakeId" = si."id"

GROUP BY
    course."id",
    course."courseName",
    uni."id",
    uni."uniName"

ORDER BY
    uni."uniName",
    course."courseName";
```