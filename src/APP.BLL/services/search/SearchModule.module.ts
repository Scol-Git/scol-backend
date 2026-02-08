import { Module } from '@nestjs/common';

// Orchestrators
import { HomeSearchService } from './HomeSearchService';
import { CourseSearchService } from './CourseSearchService';

// Shared services
import { UserSearchContextResolver } from './shared/UserSearchContextResolver';
import { CourseQueryBuilder } from './shared/CourseQueryBuilder';
import { CourseEligibilityClassifier } from './shared/CourseEligibilityClassifier';
import { CourseCursorPaginationService } from './shared/CourseCursorPaginationService';
import { SearchFilterService } from './shared/SearchFilterService';
import { CourseResponseMapper } from '../../mappings/search/CourseResponseMapper';

// Pipeline executor (3-phase optimized search)
import { SearchPipelineExecutor } from './shared/pipeline/SearchPipelineExecutor';

/**
 * Search Module (BLL)
 *
 * Provides optimized search services:
 * - HomeSearchService (home page with infinite scroll)
 * - CourseSearchService (normal + advanced search)
 *
 * **Architecture:**
 * - 3-phase search pipeline (candidate IDs → hydration → processing)
 * - DB-level ranking for both anonymous and logged-in users (commission / eligibility + preference + commission)
 * - Redis caching for search results (5 min) and user context (2 min)
 *
 * **Performance:**
 * - 60%+ reduction in data transfer vs loading all courses
 * - Ranking and pagination done in SQL
 * - Database indexes optimize Phase 1 candidate selection
 */
@Module({
  providers: [
    // Orchestrators (public services)
    HomeSearchService,
    CourseSearchService,

    // Pipeline executor (core optimization)
    SearchPipelineExecutor,

    // Shared services (internal)
    UserSearchContextResolver,
    CourseQueryBuilder,
    CourseEligibilityClassifier,
    CourseCursorPaginationService,
    SearchFilterService,
    CourseResponseMapper,
  ],
  exports: [HomeSearchService, CourseSearchService],
})
export class SearchModule {}
