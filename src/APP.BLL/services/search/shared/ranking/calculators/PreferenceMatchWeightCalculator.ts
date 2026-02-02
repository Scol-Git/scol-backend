import { Injectable } from '@nestjs/common';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { SearchContext } from '@shared/search/SearchTypes';
import { IWeightCalculator } from '@shared/interfaces/search/IWeightCalculator.interface';

/**
 * Weight calculator for preference matches (country, programme)
 *
 * Only applies to ELIGIBILITY_PLUS_BUSINESS mode.
 * Matching user preferences = higher score.
 *
 * **Optimization:** Uses normalizedProfile Sets for O(1) .has()
 * instead of O(n) array.includes() operations.
 */
@Injectable()
export class PreferenceMatchWeightCalculator implements IWeightCalculator {
  readonly calculatorId = 'preference_match';
  readonly order = 30; // Runs after academic and english

  /**
   * Weight values
   */
  private readonly COUNTRY_PREFERENCE_WEIGHT = 1500;
  private readonly PROGRAMME_PREFERENCE_WEIGHT = 1500;

  isApplicable(mode: RankingMode): boolean {
    return mode === RankingMode.ELIGIBILITY_PLUS_BUSINESS;
  }

  calculate(courseIntake: UniCourseIntakes, context: SearchContext): number {
    // Use normalized profile for O(1) Set lookups
    if (!context.normalizedProfile) {
      return 0;
    }

    let score = 0;
    const course = courseIntake.UniCourse;
    const university = course?.SysUniversity;
    const normalized = context.normalizedProfile;

    // Country preference match - O(1) Set.has() instead of O(n) includes()
    if (university?.sysCountryId && normalized.preferredCountryIds.size > 0) {
      if (normalized.preferredCountryIds.has(university.sysCountryId)) {
        score += this.COUNTRY_PREFERENCE_WEIGHT;
      }
    }

    // Programme preference match - O(1) Set.has() instead of O(n) includes()
    if (course?.sysProgrammeId && normalized.preferredProgrammeIds.size > 0) {
      if (normalized.preferredProgrammeIds.has(course.sysProgrammeId)) {
        score += this.PROGRAMME_PREFERENCE_WEIGHT;
      }
    }

    return score;
  }
}
