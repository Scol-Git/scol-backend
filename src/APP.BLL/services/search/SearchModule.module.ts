import { Module } from '@nestjs/common';

// Orchestrators
import { HomeSearchService } from './HomeSearchService';
import { CourseSearchService } from './CourseSearchService';

// Shared services
import { UserSearchContextResolver } from './shared/UserSearchContextResolver';
import { CourseQueryBuilder } from './shared/CourseQueryBuilder';
import { CourseRankingService } from './shared/CourseRankingService';
import { CourseEligibilityClassifier } from './shared/CourseEligibilityClassifier';
import { CourseCursorPaginationService } from './shared/CourseCursorPaginationService';
import { SearchFilterService } from './shared/SearchFilterService';
import { CourseResponseMapper } from '../../mappings/search/CourseResponseMapper';

// Ranking system
import { WEIGHT_CALCULATOR } from '@shared/interfaces/search/IWeightCalculator.interface';
import { WeightCalculatorRegistry } from './shared/ranking/WeightCalculatorRegistry';
import { CommissionWeightCalculator } from './shared/ranking/calculators/CommissionWeightCalculator';
import { AcademicMatchWeightCalculator } from './shared/ranking/calculators/AcademicMatchWeightCalculator';
import { EnglishMatchWeightCalculator } from './shared/ranking/calculators/EnglishMatchWeightCalculator';
import { PreferenceMatchWeightCalculator } from './shared/ranking/calculators/PreferenceMatchWeightCalculator';

/**
 * Search Module (BLL)
 *
 * Provides search services:
 * - HomeSearchService (home page with infinite scroll)
 * - CourseSearchService (normal + advanced search)
 *
 * Weight calculators are registered as multi-providers
 * for pluggable ranking system.
 */
@Module({
  providers: [
    // Orchestrators
    HomeSearchService,
    CourseSearchService,

    // Shared services
    UserSearchContextResolver,
    CourseQueryBuilder,
    CourseRankingService,
    CourseEligibilityClassifier,
    CourseCursorPaginationService,
    SearchFilterService,
    CourseResponseMapper,

    // Weight calculators (pluggable)
    {
      provide: WEIGHT_CALCULATOR,
      useClass: CommissionWeightCalculator,
    },
    {
      provide: WEIGHT_CALCULATOR,
      useClass: AcademicMatchWeightCalculator,
    },
    {
      provide: WEIGHT_CALCULATOR,
      useClass: EnglishMatchWeightCalculator,
    },
    {
      provide: WEIGHT_CALCULATOR,
      useClass: PreferenceMatchWeightCalculator,
    },

    // Weight calculator registry
    WeightCalculatorRegistry,
  ],
  exports: [HomeSearchService, CourseSearchService],
})
export class SearchModule {}
