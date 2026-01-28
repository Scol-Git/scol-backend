import { Injectable } from '@nestjs/common';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { WeightCalculatorRegistry } from './ranking/WeightCalculatorRegistry';
import { SearchContext, RankedCourse } from '@shared/search/SearchTypes';

/**
 * Ranks courses using the weight calculator system
 *
 * Used by both Home and Search services.
 */
@Injectable()
export class CourseRankingService {
  constructor(private readonly weightRegistry: WeightCalculatorRegistry) {}

  /**
   * Rank courses by calculating scores and sorting
   * @param courses - Course intakes to rank
   * @param context - Search context with user profile
   * @returns Ranked courses sorted by score (highest first)
   */
  rankCourses(
    courses: UniCourseIntakes[],
    context: SearchContext,
  ): RankedCourse[] {
    // Calculate score for each course
    const rankedCourses: RankedCourse[] = courses.map((courseIntake) => ({
      courseIntake,
      rankScore: this.weightRegistry.calculateTotalScore(courseIntake, context),
      isEligible: true, // Will be set by eligibility classifier
    }));

    // Sort by score descending, then by ID for deterministic order
    return rankedCourses.sort((a, b) => {
      // Primary: rank score descending
      if (b.rankScore !== a.rankScore) {
        return b.rankScore - a.rankScore;
      }
      // Secondary: ID ascending (deterministic tie-breaker)
      return a.courseIntake.id.localeCompare(b.courseIntake.id);
    });
  }

  /**
   * Get score breakdown for debugging
   */
  getScoreBreakdown(
    courseIntake: UniCourseIntakes,
    context: SearchContext,
  ): Record<string, number> {
    return this.weightRegistry.getScoreBreakdown(courseIntake, context);
  }
}
