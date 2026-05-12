import { Injectable } from '@nestjs/common';

/**
 * SQL fragments aligned with CourseEligibilityService for search (no per-row service calls).
 */
@Injectable()
export class SearchEligibilitySqlBuilder {
  /**
   * Academic eligibility using LEFT JOIN aliases larMin, larHigher on LeadAcademicResults.
   */
  academicEligibleExpr(): string {
    return `(CASE
      WHEN course."minSysDegreeId" IS NULL THEN 1
      WHEN larMin.lead_id IS NOT NULL THEN 1
      WHEN course."higherSysDegreeId" IS NOT NULL AND larHigher.lead_id IS NOT NULL THEN 1
      ELSE 0
    END)`;
  }

  /**
   * English eligibility: OR across CourseEngReq rows (at least one fully satisfied).
   * When minSectionReq is set, every catalog section must have a lead score >= minSectionReq.
   * Uses :leadId query parameter.
   */
  englishEligibleExpr(): string {
    return `(CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM "CourseEngReq" cer0 WHERE cer0."uniCourseId" = course.id
      ) THEN 1
      WHEN EXISTS (
        SELECT 1 FROM "CourseEngReq" cer0
        WHERE cer0."uniCourseId" = course.id
        AND EXISTS (
          SELECT 1 FROM "LeadEnglishTestResults" letr0
          WHERE letr0."leadId" = :leadId
            AND letr0."sysEngTestId" = cer0."sysEngTestId"
            AND CAST(letr0."overallScore" AS DECIMAL) >= CAST(COALESCE(cer0."minOverallReq", 0) AS DECIMAL)
        )
        AND (
          cer0."minSectionReq" IS NULL
          OR NOT EXISTS (
            SELECT 1 FROM "sys_EnglishTestSections" ets
            WHERE ets."testId" = cer0."sysEngTestId"
            AND NOT EXISTS (
              SELECT 1 FROM "LeadEnglishTestSectionResults" lets0
              INNER JOIN "LeadEnglishTestResults" letr1 ON lets0."resultId" = letr1.id
              WHERE letr1."leadId" = :leadId
                AND letr1."sysEngTestId" = cer0."sysEngTestId"
                AND lets0."sysEngTestSectionId" = ets.id
                AND CAST(lets0."sectionScore" AS DECIMAL) >= CAST(cer0."minSectionReq" AS DECIMAL)
            )
          )
        )
      ) THEN 1
      ELSE 0
    END)`;
  }

  eligibleExpr(academicExpr: string, englishExpr: string): string {
    return `((${academicExpr}) > 0 AND (${englishExpr}) > 0)`;
  }
}
