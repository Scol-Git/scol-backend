import { Injectable } from '@nestjs/common';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { SearchContext, NormalizedLeadProfile } from '@shared/search/SearchTypes';
import { IWeightCalculator } from '@shared/interfaces/search/IWeightCalculator.interface';

/**
 * Weight calculator for academic eligibility match
 *
 * Only applies to ELIGIBILITY_PLUS_BUSINESS mode.
 * Higher match with academic requirements = higher score.
 *
 * **Optimization:** Uses normalizedProfile for O(1) Map lookups
 * instead of O(n) array.find() operations.
 */
@Injectable()
export class AcademicMatchWeightCalculator implements IWeightCalculator {
  readonly calculatorId = 'academic_match';
  readonly order = 10; // Runs early (high priority)

  /**
   * Weight values
   */
  private readonly BASE_ACADEMIC_WEIGHT = 5000;

  isApplicable(mode: RankingMode): boolean {
    return mode === RankingMode.ELIGIBILITY_PLUS_BUSINESS;
  }

  calculate(courseIntake: UniCourseIntakes, context: SearchContext): number {
    // Use normalized profile for O(1) lookups
    if (!context.normalizedProfile) {
      return 0;
    }

    const course = courseIntake.UniCourse;
    const normalized = context.normalizedProfile;

    // No academic requirement = full points
    if (!course?.minSysDegreeId) {
      return this.BASE_ACADEMIC_WEIGHT;
    }

    // No degrees = no points
    if (normalized.academicResultsByDegreeId.size === 0) {
      return 0;
    }

    // O(1) lookup for exact match by degree ID
    const exactMatch = normalized.academicResultsByDegreeId.get(
      course.minSysDegreeId,
    );

    if (exactMatch && course.minGpa) {
      const requiredGpa = parseFloat(course.minGpa);
      const surplus = exactMatch.gpa - requiredGpa; // gpa already parsed

      if (surplus >= 0) return this.BASE_ACADEMIC_WEIGHT;
    }

    // If minimum degree match does not meet GPA, check higher degree
    if (course.higherSysDegreeId) {
      // O(1) lookup for higher degree
      const higherMatch = normalized.academicResultsByDegreeId.get(
        course.higherSysDegreeId,
      );

      if (higherMatch && course.higherGpa) {
        const requiredGpa = parseFloat(course.higherGpa);
        const surplus = higherMatch.gpa - requiredGpa; // gpa already parsed

        if (surplus >= 0) return this.BASE_ACADEMIC_WEIGHT;
      }
    }

    // default return 0
    return 0;
  }
}
