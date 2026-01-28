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
    if (!context.leadProfile) {
      return 0;
    }

    let score = 0;
    const course = courseIntake.UniCourse;
    const university = course?.SysUniversity;

    // Country preference match
    if (
      university?.sysCountryId &&
      context.leadProfile.preferredCountryIds.length > 0
    ) {
      if (
        context.leadProfile.preferredCountryIds.includes(university.sysCountryId)
      ) {
        score += this.COUNTRY_PREFERENCE_WEIGHT;
      }
    }

    // Programme preference match
    if (
      course?.sysProgrammeId &&
      context.leadProfile.preferredProgrammeIds.length > 0
    ) {
      if (
        context.leadProfile.preferredProgrammeIds.includes(course.sysProgrammeId)
      ) {
        score += this.PROGRAMME_PREFERENCE_WEIGHT;
      }
    }

    return score;
  }
}
