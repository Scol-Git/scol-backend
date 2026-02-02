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
 *
 * **Optimization:** Uses normalizedProfile for O(1) Map lookups
 * instead of O(n) array.find() operations. Scores are pre-parsed.
 */
@Injectable()
export class EnglishMatchWeightCalculator implements IWeightCalculator {
  readonly calculatorId = 'english_match';
  readonly order = 20; // Runs after academic

  /**
   * Weight values
   */
  private readonly BASE_ENGLISH_WEIGHT = 3000;

  isApplicable(mode: RankingMode): boolean {
    return mode === RankingMode.ELIGIBILITY_PLUS_BUSINESS;
  }

  calculate(courseIntake: UniCourseIntakes, context: SearchContext): number {
    // Use normalized profile for O(1) lookups
    if (!context.normalizedProfile) {
      return 0;
    }

    const engReqs = courseIntake.UniCourse?.CourseEngReq ?? [];
    const normalized = context.normalizedProfile;

    // No English requirement = full points
    if (engReqs.length === 0) {
      return this.BASE_ENGLISH_WEIGHT;
    }

    // No test results = no points
    if (normalized.englishResultsByTestId.size === 0) {
      return 0;
    }

    // Find any matching test result and return score
    for (const req of engReqs) {
      // O(1) lookup by test ID
      const matchingTest = normalized.englishResultsByTestId.get(
        req.sysEngTestId,
      );

      if (!matchingTest) continue;

      const requiredScore = parseFloat(req.minOverallReq ?? '0');

      // overallScore is already pre-parsed as number
      if (matchingTest.overallScore < requiredScore) continue;

      // If all checks pass, return score
      return this.BASE_ENGLISH_WEIGHT;
    }

    return 0;
  }
}
