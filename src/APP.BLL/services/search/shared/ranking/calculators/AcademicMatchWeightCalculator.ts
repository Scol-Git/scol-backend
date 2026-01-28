import { Injectable } from '@nestjs/common';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { SearchContext } from '@shared/search/SearchTypes';
import { IWeightCalculator } from '@shared/interfaces/search/IWeightCalculator.interface';

/**
 * Weight calculator for academic eligibility match
 *
 * Only applies to ELIGIBILITY_PLUS_BUSINESS mode.
 * Higher match with academic requirements = higher score.
 */
@Injectable()
export class AcademicMatchWeightCalculator implements IWeightCalculator {
  readonly calculatorId = 'academic_match';
  readonly order = 10; // Runs early (high priority)

  /**
   * Weight values
   */
  private readonly BASE_ACADEMIC_WEIGHT = 5000;
  private readonly EXACT_DEGREE_BONUS = 2000;
  private readonly GPA_SURPLUS_MULTIPLIER = 500;

  isApplicable(mode: RankingMode): boolean {
    return mode === RankingMode.ELIGIBILITY_PLUS_BUSINESS;
  }

  calculate(courseIntake: UniCourseIntakes, context: SearchContext): number {
    if (!context.leadProfile) {
      return 0;
    }

    const course = courseIntake.UniCourse;
    const leadDegrees = context.leadProfile.academicResults;

    // No academic requirement = full points
    if (!course?.minSysDegreeId) {
      return this.BASE_ACADEMIC_WEIGHT;
    }

    // No degrees = no points
    if (leadDegrees.length === 0) {
      return 0;
    }

    // Find exact match for required degree
    const exactMatch = leadDegrees.find(
      (d) => d.degreeId === course.minSysDegreeId,
    );

    if (exactMatch && exactMatch.gpa && course.minGpa) {
      const leadGpa = parseFloat(exactMatch.gpa);
      const requiredGpa = parseFloat(course.minGpa);
      const surplus = leadGpa - requiredGpa;
      // score += surplus * this.GPA_SURPLUS_MULTIPLIER;

      if (surplus >= 0) return this.BASE_ACADEMIC_WEIGHT;
    }

    // if exact minimum degree match does not match, check if lead has higher degree match
    const higherMatch = leadDegrees.find(
      (d) => d.degreeId === course.higherSysDegreeId,
    );

    if (higherMatch && higherMatch.gpa && course.higherGpa) {
      const leadGpa = parseFloat(higherMatch.gpa);
      const requiredGpa = parseFloat(course.higherGpa);
      const surplus = leadGpa - requiredGpa;

      if (surplus >= 0) return this.BASE_ACADEMIC_WEIGHT;
    }

    // default return 0
    return 0;
  }
}
