import { Module } from '@nestjs/common';

import { LeadsModule } from '@bll/services/leads/LeadsModule.module';

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

// Pipeline executor (3-phase optimized search)
import { SearchPipelineExecutor } from './shared/pipeline/SearchPipelineExecutor';

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
 * Provides optimized search services:
 * - HomeSearchService (home page with infinite scroll)
 * - CourseSearchService (normal + advanced search)
 *
 * **Architecture:**
 * - 3-phase search pipeline (candidate IDs → hydration → processing)
 * - DB-level commission ranking for anonymous users
 * - In-memory ranking for logged-in users (eligibility + preferences)
 * - Redis caching for search results (5 min) and user context (2 min)
 *
 * **Performance:**
 * - 60%+ reduction in data transfer vs loading all courses
 * - Eliminates in-memory sorting for anonymous users
 * - Database indexes optimize Phase 1 candidate selection
 *
 * Weight calculators are registered as multi-providers
 * for pluggable ranking system.
 */
@Module({
  imports: [LeadsModule],
  providers: [
    // =========================================================================
    // Orchestrators (public services)
    // =========================================================================
    HomeSearchService,
    CourseSearchService,

    // =========================================================================
    // Pipeline executor (core optimization)
    // =========================================================================
    SearchPipelineExecutor,

    // =========================================================================
    // Shared services (internal)
    // =========================================================================
    UserSearchContextResolver,
    CourseQueryBuilder,
    CourseRankingService,
    CourseEligibilityClassifier,
    CourseCursorPaginationService,
    SearchFilterService,
    CourseResponseMapper,

    // =========================================================================
    // Weight calculators (pluggable ranking system)
    // =========================================================================
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
