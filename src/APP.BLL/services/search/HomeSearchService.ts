import { Injectable, Inject } from '@nestjs/common';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { ICurrentUser } from '@shared/interfaces/domain';
import { ListType } from '@shared/enums/ListType.enum';
import { HomeRequestDto } from '@shared/dtos/search/HomeRequestDto';
import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';
import { UserSearchContextResolver } from './shared/UserSearchContextResolver';
import { CourseQueryBuilder } from './shared/CourseQueryBuilder';
import { CourseRankingService } from './shared/CourseRankingService';
import { CourseEligibilityClassifier } from './shared/CourseEligibilityClassifier';
import { CourseCursorPaginationService } from './shared/CourseCursorPaginationService';
import { CourseResponseMapper } from '../../mappings/search/CourseResponseMapper';
import { RankedCourse } from '@shared/search/SearchTypes';

/**
 * Home Page Search Service
 *
 * Handles home page with:
 * - No filters (shows all courses)
 * - Weight-based ranking
 * - Infinite scroll pagination
 * - Eligibility classification
 */
@Injectable()
export class HomeSearchService {
  constructor(
    private readonly contextResolver: UserSearchContextResolver,
    private readonly queryBuilder: CourseQueryBuilder,
    private readonly rankingService: CourseRankingService,
    private readonly eligibilityClassifier: CourseEligibilityClassifier,
    private readonly paginationService: CourseCursorPaginationService,
    private readonly responseMapper: CourseResponseMapper,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Get home page courses
   * @param request - Home request with pagination and listType
   * @param user - Current user (optional)
   */
  async getHomeCourses(
    request: HomeRequestDto,
    user?: ICurrentUser,
  ): Promise<SearchResponseDto> {
    this.logger.debug?.('Home search started', {
      context: 'HomeSearchService.getHomeCourses',
      userId: user?.userId,
      listType: request.listType,
    });

    // 1. Resolve user context
    const context = await this.contextResolver.resolve(user);

    this.logger.debug?.('Search context resolved', {
      context: 'HomeSearchService.getHomeCourses',
      userState: context.userState,
      formStatus: context.academicFormStatus,
      rankingMode: context.rankingMode,
    });

    // 2. Build base query (NO filters - show everything)
    let query = this.queryBuilder.buildBaseQuery();
    query = this.queryBuilder.applyDefaultOrdering(query);

    // 3. Fetch all active courses
    const allCourses = await query.getMany();

    this.logger.debug?.('Courses fetched', {
      context: 'HomeSearchService.getHomeCourses',
      totalCourses: allCourses.length,
    });

    // 4. Rank courses (weight-based)
    const rankedCourses = this.rankingService.rankCourses(allCourses, context);

    // 5. Classify eligibility
    const classifiedCourses = this.eligibilityClassifier.classify(
      rankedCourses,
      context,
    );

    // 6. Filter by listType
    const listType = request.listType ?? ListType.ELIGIBLE_ONLY;
    const filteredCourses = this.filterByListType(classifiedCourses, listType);

    // 7. Apply cursor pagination
    const paginated = this.paginationService.applyPagination(
      filteredCourses,
      request.pagination?.cursor,
      request.pagination?.limit,
    );

    this.logger.debug?.('Home search completed', {
      context: 'HomeSearchService.getHomeCourses',
      resultCount: paginated.items.length,
      hasNext: paginated.hasNext,
    });

    // 8. Map and return response
    return this.responseMapper.toSearchResponse(context, paginated, listType);
  }

  /**
   * Filter courses by list type
   */
  private filterByListType(courses: RankedCourse[], listType: ListType) {
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
