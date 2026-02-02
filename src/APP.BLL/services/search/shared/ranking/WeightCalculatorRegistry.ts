import { Injectable, Inject, Optional } from '@nestjs/common';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { SearchContext } from '@shared/search/SearchTypes';
import {
  IWeightCalculator,
  WEIGHT_CALCULATOR,
} from '@shared/interfaces/search/IWeightCalculator.interface';

/**
 * Registry for weight calculators
 *
 * Collects all registered weight calculators and provides methods
 * to calculate total ranking scores for courses.
 */
@Injectable()
export class WeightCalculatorRegistry {
  private readonly calculators: IWeightCalculator[];

  constructor(
    @Optional()
    @Inject(WEIGHT_CALCULATOR)
    calculators: IWeightCalculator[] | IWeightCalculator | undefined = [],
  ) {
    const list = Array.isArray(calculators)
      ? calculators
      : calculators
        ? [calculators]
        : [];

    // Sort by order for deterministic calculation
    this.calculators = [...list].sort((a, b) => a.order - b.order);
  }

  /**
   * Get all calculators applicable for the given ranking mode
   */
  getApplicableCalculators(mode: RankingMode): IWeightCalculator[] {
    return this.calculators.filter((c) => c.isApplicable(mode));
  }

  /**
   * Calculate total rank score for a course
   * @param courseIntake - The course intake entity
   * @param context - The search context
   * @returns Total score from all applicable calculators
   */
  calculateTotalScore(
    courseIntake: UniCourseIntakes,
    context: SearchContext,
  ): number {
    const applicableCalculators = this.getApplicableCalculators(
      context.rankingMode,
    );

    return applicableCalculators.reduce((total, calculator) => {
      const score = calculator.calculate(courseIntake, context);
      return total + score;
    }, 0);
  }

  /**
   * Get breakdown of scores by calculator (for debugging/logging)
   */
  getScoreBreakdown(
    courseIntake: UniCourseIntakes,
    context: SearchContext,
  ): Record<string, number> {
    const applicableCalculators = this.getApplicableCalculators(
      context.rankingMode,
    );

    const breakdown: Record<string, number> = {};

    for (const calculator of applicableCalculators) {
      breakdown[calculator.calculatorId] = calculator.calculate(
        courseIntake,
        context,
      );
    }

    return breakdown;
  }
}
