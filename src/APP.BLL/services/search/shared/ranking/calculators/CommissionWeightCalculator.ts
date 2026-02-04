import { Injectable } from '@nestjs/common';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { CommissionType } from '@shared/enums/CommissionType.enum';
import { SearchContext } from '@shared/search/SearchTypes';
import { IWeightCalculator } from '@shared/interfaces/search/IWeightCalculator.interface';

/**
 * Weight calculator for business commission
 *
 * Applies to ALL ranking modes.
 * Higher commission = higher score.
 */
@Injectable()
export class CommissionWeightCalculator implements IWeightCalculator {
  readonly calculatorId = 'commission';
  readonly order = 100; // Runs after eligibility calculators

  /**
   * Weight multiplier for commission
   * Commission is typically 0-50 (percentage)
   * Multiplying by 100 gives 0-5000 points
   */
  private readonly COMMISSION_MULTIPLIER = 100;
  private readonly COMMISSION_MAX_WEIGHT = 5000;
  isApplicable(_mode: RankingMode): boolean {
    //for eslint disable
    void _mode;
    // Commission is always applicable
    return true;
  }

  calculate(courseIntake: UniCourseIntakes, _context: SearchContext): number {
    // for eslint disable
    void _context;
    
    const university = courseIntake.UniCourse?.SysUniversity as
      | { commission?: string | null; commissionType?: CommissionType | null }
      | undefined;
    const commissionValue = parseFloat(university?.commission ?? '0');
    // Treat null/undefined as AMOUNT so DB and in-memory ranking match (typical data has numeric amounts)
    const commissionType =
      university?.commissionType ?? CommissionType.AMOUNT;

    if (!Number.isFinite(commissionValue) || commissionValue <= 0) {
      return 0;
    }

    if (commissionType === CommissionType.AMOUNT) {
      // Amount-based commission capped to same max as percentage
      return Math.min(commissionValue, this.COMMISSION_MAX_WEIGHT);
    }

    // Percentage-based commission
    // Commission of 10% = 1000 points
    // Commission of 50% = 5000 points
    return Math.min(
      commissionValue * this.COMMISSION_MULTIPLIER,
      this.COMMISSION_MAX_WEIGHT,
    );
  }
}
