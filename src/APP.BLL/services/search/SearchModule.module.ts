import { Module } from '@nestjs/common';

import { LeadsModule } from '@bll/services/leads/LeadsModule.module';
import { WishlistStateModule } from '@bll/services/shared/wishlist/WishlistStateModule.module';

// Orchestrators
import { HomeSearchService } from './HomeSearchService';
import { CourseSearchService } from './CourseSearchService';

// Shared services
import { UserSearchContextResolver } from './shared/UserSearchContextResolver';
import { CourseCursorPaginationService } from './shared/CourseCursorPaginationService';
import { CourseResponseMapper } from '../../mappings/search/CourseResponseMapper';
import { SearchFilterOptionsService } from './shared/filters/SearchFilterOptionsService';
import { SearchResultCacheService } from './shared/cache/SearchResultCacheService';

// Pipeline executor (3-phase optimized search)
import { SearchPipelineExecutor } from './shared/pipeline/SearchPipelineExecutor';
import { SearchBaseQueryBuilder } from './shared/pipeline/query/SearchBaseQueryBuilder';
import { BusinessOnlyCandidateQuery } from './shared/pipeline/query/BusinessOnlyCandidateQuery';
import { PersonalizedCandidateQuery } from './shared/pipeline/query/PersonalizedCandidateQuery';
import { SearchRankingSqlBuilder } from './shared/pipeline/query/SearchRankingSqlBuilder';
import { SearchEligibilitySqlBuilder } from './shared/pipeline/query/SearchEligibilitySqlBuilder';
import { CourseSearchHydrator } from './shared/pipeline/hydration/CourseSearchHydrator';

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
  imports: [LeadsModule, WishlistStateModule],
  providers: [
    HomeSearchService,
    CourseSearchService,
    SearchFilterOptionsService,

    SearchPipelineExecutor,
    SearchResultCacheService,
    SearchBaseQueryBuilder,
    BusinessOnlyCandidateQuery,
    PersonalizedCandidateQuery,
    SearchRankingSqlBuilder,
    SearchEligibilitySqlBuilder,
    CourseSearchHydrator,

    UserSearchContextResolver,
    CourseCursorPaginationService,
    CourseResponseMapper,
  ],
  exports: [HomeSearchService, CourseSearchService],
})
export class SearchModule {}
