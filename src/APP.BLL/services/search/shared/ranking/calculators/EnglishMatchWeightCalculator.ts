import { Injectable } from '@nestjs/common';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { SearchContext } from '@shared/search/SearchTypes';
import { IWeightCalculator } from '@shared/interfaces/search/IWeightCalculator.interface';

/**
 * Weight calculator for English test match
 *
 * Only applies to ELIGIBILITY_PLUS_BUSINESS mode.
 * Meeting/exceeding English requirements = higher score.
 */
@Injectable()
export class EnglishMatchWeightCalculator implements IWeightCalculator {
  readonly calculatorId = 'english_match';
  readonly order = 20; // Runs after academic

  /**
   * Weight values
   */
  private readonly BASE_ENGLISH_WEIGHT = 3000;
  private readonly SCORE_SURPLUS_MULTIPLIER = 200;

  isApplicable(mode: RankingMode): boolean {
    return mode === RankingMode.ELIGIBILITY_PLUS_BUSINESS;
  }

  calculate(courseIntake: UniCourseIntakes, context: SearchContext): number {
    if (!context.leadProfile) {
      return 0;
    }

    const engReqs = courseIntake.UniCourse?.CourseEngReq ?? [];
    const leadTests = context.leadProfile.englishTestResults;

    // No English requirement = full points
    if (engReqs.length === 0) {
      return this.BASE_ENGLISH_WEIGHT;
    }

    // No test results = no points
    if (leadTests.length === 0) {
      return 0;
    }

    // Find any matching test result and return score
    for (const req of engReqs) {
      const matchingTest = leadTests.find(
        (t) => t.sysEngTestId === req.sysEngTestId,
      );

      if (!matchingTest?.overallScore) continue;

      const leadScore = parseFloat(matchingTest.overallScore);
      const requiredScore = parseFloat(req.minOverallReq ?? '0');

      if (leadScore < requiredScore) continue;

      /*
      const minSectionReq =
        req.minSectionReq !== null && req.minSectionReq !== undefined
          ? parseFloat(req.minSectionReq)
          : undefined;
      
      // If section minimum exists, all section scores must meet it
      if (minSectionReq !== undefined) {
        const sectionResults = matchingTest.LeadEnglishTestSectionResult as
          | Array<{ sectionScore?: string | null }>
          | undefined;

        if (!sectionResults || sectionResults.length === 0) continue;        

        const allSectionsMeet = sectionResults.every((section) => {
          const score =
            section.sectionScore !== null && section.sectionScore !== undefined
              ? parseFloat(section.sectionScore)
              : NaN;
          return Number.isFinite(score) && score >= minSectionReq;
        });

        if (!allSectionsMeet) continue;
      }
      */
      // If all checks pass, return score
      return this.BASE_ENGLISH_WEIGHT;
    }

    return 0;
  }
}
