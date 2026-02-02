import { Injectable, Inject } from '@nestjs/common';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { ICurrentUser } from '@shared/interfaces/domain';
import { ListType } from '@shared/enums/ListType.enum';
import { HomeRequestDto } from '@shared/dtos/search/HomeRequestDto';
import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';
import { UserSearchContextResolver } from './shared/UserSearchContextResolver';
import { SearchPipelineExecutor } from './shared/pipeline/SearchPipelineExecutor';

/**
 * Home Page Search Service
 *
 * Handles home page with:
 * - No filters (shows all active courses)
 * - Weight-based ranking (or DB commission ranking for anonymous users)
 * - Infinite scroll pagination via cursor
 * - Eligibility classification (for logged-in users)
 *
 * **Optimizations:**
 * - Uses 3-phase search pipeline (candidate IDs → hydration → processing)
 * - DB-level commission ranking for anonymous users
 * - Redis caching with 5-minute TTL
 * - 60%+ reduction in data transfer vs loading all courses
 *
 * @see SearchPipelineExecutor for implementation details
 */
@Injectable()
export class HomeSearchService {
  constructor(
    private readonly contextResolver: UserSearchContextResolver,
    private readonly pipelineExecutor: SearchPipelineExecutor,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Get home page courses
   *
   * @param request - Home request with pagination and listType
   * @param user - Current user (optional, affects ranking mode)
   * @returns Paginated course results with eligibility info
   */
  async getHomeCourses(
    request: HomeRequestDto,
    user?: ICurrentUser,
  ): Promise<SearchResponseDto> {
    this.logger.debug?.('Home search started', {
      context: 'HomeSearchService.getHomeCourses',
      userId: user?.userId,
      listType: request.listType,
      cursor: request.pagination?.cursor ? 'provided' : 'none',
    });

    // 1. Resolve user context (cached for 2 minutes)
    const context = await this.contextResolver.resolve(user);

    this.logger.debug?.('Search context resolved', {
      context: 'HomeSearchService.getHomeCourses',
      userState: context.userState,
      formStatus: context.academicFormStatus,
      rankingMode: context.rankingMode,
    });

    // 2. Execute optimized search pipeline
    // - No filters for home page (all active courses)
    // - Ranking: DB-level for anonymous, in-memory for logged-in
    // - Results cached in Redis
    const result = await this.pipelineExecutor.execute({
      // No search text or filters for home page
      listType: request.listType ?? ListType.ELIGIBLE_ONLY,
      cursor: request.pagination?.cursor,
      limit: request.pagination?.limit,
      context,
    });

    this.logger.debug?.('Home search completed', {
      context: 'HomeSearchService.getHomeCourses',
      resultCount: result.courses.length,
      hasNext: result.pagination.hasNext,
    });

    return result;
  }
}
