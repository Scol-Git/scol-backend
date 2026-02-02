import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { SearchContext } from '@shared/search/SearchTypes';

/**
 * Injection token for weight calculators
 */
export const WEIGHT_CALCULATOR = Symbol('WEIGHT_CALCULATOR');

/**
 * Interface for pluggable weight calculators
 *
 * Weight calculators contribute to the total ranking score of a course.
 * Each calculator is responsible for a specific aspect of ranking
 * (e.g., commission, academic match, English match, preferences).
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class CommissionWeightCalculator implements IWeightCalculator {
 *   readonly calculatorId = 'commission';
 *   readonly order = 100;
 *
 *   isApplicable(mode: RankingMode): boolean {
 *     return true; // Always applicable
 *   }
 *
 *   calculate(courseIntake: UniCourseIntakes, context: SearchContext): number {
 *     const commission = parseFloat(courseIntake.course?.university?.commission ?? '0');
 *     return commission * 1000;
 *   }
 * }
 * ```
 */
export interface IWeightCalculator {
  /**
   * Unique identifier for this calculator
   */
  readonly calculatorId: string;

  /**
   * Order in which this calculator runs (lower = earlier)
   * Used for deterministic calculation order
   */
  readonly order: number;

  /**
   * Whether this calculator is applicable for the given ranking mode
   * @param mode - The current ranking mode
   * @returns true if this calculator should contribute to ranking
   */
  isApplicable(mode: RankingMode): boolean;

  /**
   * Calculate weight contribution for a course
   * @param courseIntake - The course intake entity
   * @param context - The search context with user profile data
   * @returns Weight value (will be summed with other calculators)
   */
  calculate(courseIntake: UniCourseIntakes, context: SearchContext): number;
}
