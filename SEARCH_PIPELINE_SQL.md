# Search Pipeline – SQL Structure

This document describes the exact SQL shape for DB-driven ranking (Phase 1). Implementation is in `SearchPipelineExecutor`.

---

## Logged-in path (ELIGIBILITY_PLUS_BUSINESS)

**Method:** `getRankedCandidatesDbDriven()`

**Structure:** 3-level query so each score is computed once; listType and cursor are applied before LIMIT.

### L1 (scores once)

```sql
SELECT
  ci.id AS "courseIntakeId",
  -- academicScore: CASE rankingMode, minSysDegreeId NULL, EXISTS min degree (minGpa NULL OR gpa>=minGpa), ELSE higher degree
  (CASE ... END) AS "academicScore",
  -- englishScore: CASE rankingMode, no CourseEngReq, EXISTS req with overall+section check
  (CASE ... END) AS "englishScore",
  -- preferenceScore: CASE rankingMode, country 1500 + programme 1500
  (CASE ... END) AS "preferenceScore",
  -- commissionScore: AMOUNT vs PERCENTAGE, cap 5000
  (CASE ... END) AS "commissionScore"
FROM "UniCourseIntakes" ci
INNER JOIN "UniCourses" course ON ...
INNER JOIN "sys_Universities" uni ON ...
...
WHERE ci.isActive = true
  AND (filters from applyFilters)
```

### L2 (rankScore as BIGINT, eligible)

```sql
SELECT
  s1."courseIntakeId",
  CAST(s1."academicScore" + s1."englishScore" + s1."preferenceScore" + s1."commissionScore" AS BIGINT) AS "rankScore",
  (s1."academicScore" > 0 AND s1."englishScore" > 0) AS eligible
FROM (L1) s1
```

### L3 (listType, cursor, order, limit)

```sql
SELECT s2."courseIntakeId", s2."rankScore", s2.eligible
FROM (L2) s2
WHERE (:listTypeEligible IS NULL OR s2.eligible = :listTypeEligible)
  AND (:cursorScore IS NULL OR (s2."rankScore", s2."courseIntakeId") < (:cursorScore, :cursorId))
ORDER BY s2."rankScore" DESC, s2."courseIntakeId" ASC
LIMIT :limitPlusOne
```

**Cursor:** `(rankScore, courseIntakeId)`; rankScore is integer (BIGINT). Decode passes integer into L3.

---

## Anonymous path (BUSINESS_ONLY)

**Method:** `getCandidateIdsWithCommissionRanking()`

**Structure:** Inner query computes commission score; outer query applies cursor and ORDER BY using the subquery columns (no alias-in-WHERE).

### Inner

```sql
SELECT
  ci.id AS id,
  (CASE
    WHEN COALESCE(uni."commissionType", 'AMOUNT') = 'AMOUNT'
    THEN LEAST(COALESCE(CAST(uni.commission AS DECIMAL), 0), 5000)
    ELSE LEAST(COALESCE(CAST(uni.commission AS DECIMAL), 0) * 100, 5000)
  END) AS "commissionScore"
FROM "UniCourseIntakes" ci
INNER JOIN "UniCourses" course ON ...
INNER JOIN "sys_Universities" uni ON ...
...
WHERE ci.isActive = true
  AND (filters from applyFilters)
```

### Outer

```sql
SELECT sub.id, sub."commissionScore"
FROM (inner) sub
WHERE (:cursorScore IS NULL OR (sub."commissionScore", sub.id) < (:cursorScore, :cursorId))
ORDER BY sub."commissionScore" DESC, sub.id ASC
LIMIT :limitPlusOne
```

**Cursor:** `(commissionScore, id)`; commissionScore is integer for consistency.

---

## Indexes (entity-level, DB-agnostic)

Defined via `@Index()` on entities for replaceability across databases:

- `LeadAcademicResults`: `IX_LeadAcademicResults_lead_id_degree_id` (leadId, degreeId)
- `LeadEnglishTestResults`: `IX_LeadEnglishTestResults_leadId_sysEngTestId` (leadId, sysEngTestId)
- `LeadEnglishTestSectionResults`: `IX_LeadEnglishTestSectionResults_resultId_sectionScore` (resultId, sectionScore)
- `LeadPreferredCountries`: `IX_LeadPreferredCountries_lead_id_country_id` (leadId, countryId)
- `LeadPreferredPrograms`: `IX_LeadPreferredPrograms_lead_id_programme_id` (leadId, programmeId)
