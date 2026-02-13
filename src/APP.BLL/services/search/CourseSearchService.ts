import { Injectable, Inject } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { ICurrentUser } from '@shared/interfaces/domain';
import { ListType } from '@shared/enums/ListType.enum';
import { SearchRequestDto } from '@shared/dtos/search/SearchRequestDto';
import { AdvancedSearchRequestDto } from '@shared/dtos/search/AdvancedSearchRequestDto';
import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';
import { AdvancedFiltersResponseDto } from '@shared/dtos/search/AdvancedFiltersResponseDto';
import { UserSearchContextResolver } from './shared/UserSearchContextResolver';
import { SearchPipelineExecutor } from './shared/pipeline/SearchPipelineExecutor';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';

/**
 * Course Search Service
 *
 * Handles Normal Search and Advanced Search:
 * - Text search across course name, university, country
 * - Strict ID filters (country, city, programme, intake)
 * - Range filters (tuition fee, duration)
 * - Boolean flags (hasScholarship)
 * - Internal weight-based ranking (automatic)
 * - Eligibility classification (for logged-in users)
 * - ListType filtering (ELIGIBLE_ONLY, INELIGIBLE_ONLY, ALL)
 *
 * **Ranking:**
 * - Anonymous users: Commission-based ranking (DB-level)
 * - Logged-in users: Eligibility + Preferences + Commission ranking
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
export class CourseSearchService {
  constructor(
    private readonly contextResolver: UserSearchContextResolver,
    private readonly pipelineExecutor: SearchPipelineExecutor,
    private readonly db: AppDbContext,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Normal search (with searchText only)
   *
   * @param request - Search request with text and pagination
   * @param user - Current user (optional, affects ranking mode)
   * @returns Paginated course results matching the search text
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

    // 1. Resolve user context (cached for 2 minutes)
    const context = await this.contextResolver.resolve(user);

    // 2. Execute optimized search pipeline
    const result = await this.pipelineExecutor.execute({
      searchText: request.searchText,
      listType: request.listType ?? ListType.ELIGIBLE_ONLY,
      cursor: request.pagination?.cursor,
      limit: request.pagination?.limit,
      context,
    });

    this.logger.debug?.('Normal search completed', {
      context: 'CourseSearchService.search',
      resultCount: result.courses.length,
      hasNext: result.pagination.hasNext,
    });

    return result;
  }

  /**
   * Advanced search (with filters, ranges, and flags)
   *
   * Results are automatically ranked by internal algorithm.
   *
   * @param request - Advanced search request with filters
   * @param user - Current user (optional, affects ranking mode)
   * @returns Paginated course results matching all criteria
   */
  async advancedSearch(
    request: AdvancedSearchRequestDto,
    user?: ICurrentUser,
  ): Promise<SearchResponseDto> {
    this.logger.debug?.('Advanced search started', {
      context: 'CourseSearchService.advancedSearch',
      userId: user?.userId,
      hasFilters: !!request.filters,
      hasRanges: !!request.ranges,
      hasFlags: !!request.flags,
      listType: request.listType,
    });

    // 1. Resolve user context (cached for 2 minutes)
    const context = await this.contextResolver.resolve(user);

    // 2. Execute optimized search pipeline with all parameters
    const result = await this.pipelineExecutor.execute({
      filters: request.filters,
      ranges: request.ranges,
      flags: request.flags,
      listType: request.listType ?? ListType.ELIGIBLE_ONLY,
      cursor: request.pagination?.cursor,
      limit: request.pagination?.limit,
      context,
    });

    this.logger.debug?.('Advanced search completed', {
      context: 'CourseSearchService.advancedSearch',
      resultCount: result.courses.length,
      hasNext: result.pagination.hasNext,
    });

    return result;
  }

  /**
   * Get available filter options for advanced search
   *
   * @returns Filter groups with available countries and programmes
   */
  async getAdvancedFilters(): Promise<AdvancedFiltersResponseDto> {
    this.logger.debug?.('Fetching advanced filter options', {
      context: 'CourseSearchService.getAdvancedFilters',
    });

    const [countries, programmes] = await Promise.all([
      this.db.countries.find({
        select: ['id', 'countryName'],
        where: { deletedAt: IsNull() },
        order: { countryName: 'ASC' },
      }),
      this.db.programmes.find({
        select: ['id', 'name'],
        where: { deletedAt: IsNull() },
        order: { name: 'ASC' },
      }),
    ]);

    return {
      filters: [
        {
          name: 'country',
          values: countries.map((c) => ({ id: c.id, name: c.countryName })),
        },
        {
          name: 'programme',
          values: programmes.map((p) => ({ id: p.id, name: p.name })),
        },
      ],
    };
  }
}
