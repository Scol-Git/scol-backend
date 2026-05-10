import { Injectable, Inject } from '@nestjs/common';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { ICurrentUser } from '@shared/interfaces/domain';
import { ListType } from '@shared/enums/ListType.enum';
import { HomeRequestDto } from '@shared/dtos/search/HomeRequestDto';
import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';
import { UserSearchContextResolver } from './shared/UserSearchContextResolver';
import { SearchPipelineExecutor } from './shared/pipeline/SearchPipelineExecutor';
import { WishlistMarker } from '@bll/services/wishlist/WishlistMarker';

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
 * **Wishlist:** `WishlistMarker` runs **after** `SearchPipelineExecutor` (i.e. after any
 * Redis-backed course list cache). Cache keys are per search **context**, not per user, so
 * `isWishlisted` must be layered in memory without mutating the cached array (see step 3 in
 * `getHomeCourses`).
 *
 * @see SearchPipelineExecutor for implementation details
 */
@Injectable()
export class HomeSearchService {
  constructor(
    private readonly contextResolver: UserSearchContextResolver,
    private readonly pipelineExecutor: SearchPipelineExecutor,
    private readonly wishlistMarker: WishlistMarker,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Get home page courses
   *
   * 1. Resolve search context (short-lived cache).
   * 2. Run pipeline (may return a **shared** cached course list — not keyed by user).
   * 3. Call `WishlistMarker` on that list so `isWishlisted` is per-request without
   *    writing user state into the cache.
   *
   * @param request - Home request with pagination and listType
   * @param user - Current user (optional, affects ranking mode)
   * @returns Paginated course results with eligibility info
   */
  async getHomeCourses(
    request: HomeRequestDto,
    user?: ICurrentUser,
  ): Promise<SearchResponseDto> {
    const started = Date.now();
    this.logger.debug?.('Home search started', {
      context: 'HomeSearchService.getHomeCourses',
      userId: user?.userId,
      listType: request.listType,
      hasCursor: !!request.pagination?.cursor,
    });

    const context = await this.contextResolver.resolve(user);

    // 2. Execute optimized search pipeline
    // - No filters for home page (all active courses)
    // - Ranking: DB-level for anonymous, in-memory for logged-in
    // - Results cached in Redis (cache key is per-context, NOT per-user)
    const result = await this.pipelineExecutor.execute({
      // No search text or filters for home page
      listType: request.listType ?? ListType.ELIGIBLE_ONLY,
      cursor: request.pagination?.cursor,
      limit: request.pagination?.limit,
      context,
    });

    // 3. Layer per-user `isWishlisted` on top of the cached payload.
    //    Returns the same `result.courses` reference when nothing matches
    //    so the cached object is never mutated.
    const enrichedCourses = await this.wishlistMarker.markCourseDtos(
      user?.userId,
      result.courses,
    );

    this.logger.debug?.('Home search completed', {
      context: 'HomeSearchService.getHomeCourses',
      resultCount: enrichedCourses.length,
      hasNext: result.pagination.hasNext,
      elapsedMs: Date.now() - started,
    });

    return enrichedCourses === result.courses
      ? result
      : { ...result, courses: enrichedCourses };
  }
}
