import { Injectable, Inject } from '@nestjs/common';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { ICurrentUser } from '@shared/interfaces/domain';
import { ListType } from '@shared/enums/ListType.enum';
import { SearchRequestDto } from '@shared/dtos/search/SearchRequestDto';
import { AdvancedSearchRequestDto } from '@shared/dtos/search/AdvancedSearchRequestDto';
import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';
import { UserSearchContextResolver } from './shared/UserSearchContextResolver';
import { CourseQueryBuilder } from './shared/CourseQueryBuilder';
import { SearchFilterService } from './shared/SearchFilterService';
import { CourseRankingService } from './shared/CourseRankingService';
import { CourseEligibilityClassifier } from './shared/CourseEligibilityClassifier';
import { CourseCursorPaginationService } from './shared/CourseCursorPaginationService';
import { CourseResponseMapper } from '../../mappings/search/CourseResponseMapper';
import { RankedCourse } from '@shared/search/SearchTypes';

/**
 * Course Search Service
 *
 * Handles Normal Search and Advanced Search:
 * - Strict filters (no match = no result)
 * - Weight-based ranking (same as home)
 * - Eligibility classification
 * - listType filtering (ELIGIBLE_ONLY or INELIGIBLE_ONLY)
 */
@Injectable()
export class CourseSearchService {
  constructor(
    private readonly contextResolver: UserSearchContextResolver,
    private readonly queryBuilder: CourseQueryBuilder,
    private readonly filterService: SearchFilterService,
    private readonly rankingService: CourseRankingService,
    private readonly eligibilityClassifier: CourseEligibilityClassifier,
    private readonly paginationService: CourseCursorPaginationService,
    private readonly responseMapper: CourseResponseMapper,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Normal search (with searchText)
   * @param request - Search request
   * @param user - Current user (optional)
   */
  async search(
    request: SearchRequestDto,
    user?: ICurrentUser,
  ): Promise<SearchResponseDto> {
    this.logger.debug?.('Normal search started', {
      context: 'CourseSearchService.search',
      userId: user?.userId,
      searchText: request.searchText,
      listType: request.listType,
    });

    // 1. Resolve user context
    const context = await this.contextResolver.resolve(user);

    // 2. Build query with text search
    let query = this.queryBuilder.buildBaseQuery();

    // Apply text search (strict)
    if (request.searchText?.trim()) {
      query = this.filterService.applyTextSearch(query, request.searchText);
    }

    // Apply default sorting
    query = this.filterService.applySorting(query, undefined);

    // 3. Execute query
    const matchingCourses = await query.getMany();

    this.logger.debug?.('Search query executed', {
      context: 'CourseSearchService.search',
      matchCount: matchingCourses.length,
    });

    // 4. If no matches, return empty
    const listType = request.listType ?? ListType.ELIGIBLE_ONLY;
    if (matchingCourses.length === 0) {
      return this.responseMapper.toEmptyResponse(context, listType);
    }

    // 5. Rank matching courses (same ranking as home)
    const rankedCourses = this.rankingService.rankCourses(
      matchingCourses,
      context,
    );

    // 6. Classify eligibility
    const classifiedCourses = this.eligibilityClassifier.classify(
      rankedCourses,
      context,
    );

    // 7. Filter by listType
    const filteredByListType = this.filterByListType(
      classifiedCourses,
      listType,
    );

    // 8. Apply pagination
    const paginated = this.paginationService.applyPagination(
      filteredByListType,
      request.pagination?.cursor,
      request.pagination?.limit,
    );

    this.logger.debug?.('Normal search completed', {
      context: 'CourseSearchService.search',
      resultCount: paginated.items.length,
      hasNext: paginated.hasNext,
    });

    return this.responseMapper.toSearchResponse(context, paginated, listType);
  }

  /**
   * Advanced search (with full filters, ranges, flags, sort)
   * @param request - Advanced search request
   * @param user - Current user (optional)
   */
  async advancedSearch(
    request: AdvancedSearchRequestDto,
    user?: ICurrentUser,
  ): Promise<SearchResponseDto> {
    this.logger.debug?.('Advanced search started', {
      context: 'CourseSearchService.advancedSearch',
      userId: user?.userId,
      searchText: request.searchText,
      hasFilters: !!request.filters,
      hasRanges: !!request.ranges,
      hasFlags: !!request.flags,
      listType: request.listType,
    });

    // 1. Resolve user context
    const context = await this.contextResolver.resolve(user);

    // 2. Build query
    let query = this.queryBuilder.buildBaseQuery();

    // 3. Apply text search
    if (request.searchText?.trim()) {
      query = this.filterService.applyTextSearch(query, request.searchText);
    }

    // 4. Apply all filters strictly
    query = this.filterService.applyFilters(query, request.filters);
    query = this.filterService.applyRanges(query, request.ranges);
    query = this.filterService.applyFlags(query, request.flags);

    // 5. Apply sorting
    query = this.filterService.applySorting(query, request.sort);

    // 6. Execute query
    const matchingCourses = await query.getMany();

    this.logger.debug?.('Advanced search query executed', {
      context: 'CourseSearchService.advancedSearch',
      matchCount: matchingCourses.length,
    });

    // 7. If no matches, return empty
    const listType = request.listType ?? ListType.ELIGIBLE_ONLY;
    if (matchingCourses.length === 0) {
      return this.responseMapper.toEmptyResponse(context, listType);
    }

    // 8. Rank matching courses
    const rankedCourses = this.rankingService.rankCourses(
      matchingCourses,
      context,
    );

    // 9. Classify eligibility
    const classifiedCourses = this.eligibilityClassifier.classify(
      rankedCourses,
      context,
    );

    // 10. Filter by listType
    const filteredByListType = this.filterByListType(
      classifiedCourses,
      listType,
    );

    // 11. Apply pagination
    const paginated = this.paginationService.applyPagination(
      filteredByListType,
      request.pagination?.cursor,
      request.pagination?.limit,
    );

    this.logger.debug?.('Advanced search completed', {
      context: 'CourseSearchService.advancedSearch',
      resultCount: paginated.items.length,
      hasNext: paginated.hasNext,
    });

    return this.responseMapper.toSearchResponse(context, paginated, listType);
  }

  /**
   * Filter courses by list type
   */
  private filterByListType(
    courses: RankedCourse[],
    listType: ListType,
  ): RankedCourse[] {
    switch (listType) {
      case ListType.ELIGIBLE_ONLY:
        return courses.filter((c) => c.isEligible);
      case ListType.INELIGIBLE_ONLY:
        return courses.filter((c) => !c.isEligible);
      default:
        return courses;
    }
  }
}
