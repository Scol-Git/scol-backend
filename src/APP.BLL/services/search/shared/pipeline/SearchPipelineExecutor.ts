import { Injectable, Inject } from '@nestjs/common';
import { DataSource, SelectQueryBuilder, Brackets } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { UniCourseIntakes } from '@entity/entities/UniCourseIntakes.entity';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { ICacheService as ICacheToken } from '@shared/tokens/injection.tokens';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import { ListType } from '@shared/enums/ListType.enum';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { CommissionType } from '@shared/enums/CommissionType.enum';
import { SearchFiltersDto } from '@shared/dtos/search/SearchFiltersDto';
import { SearchRangesDto } from '@shared/dtos/search/SearchRangesDto';
import { SearchFlagsDto } from '@shared/dtos/search/SearchFlagsDto';
import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';
import {
  SearchContext,
  RankedCourse,
  PaginatedResult,
} from '@shared/search/SearchTypes';
import { CourseRankingService } from '../CourseRankingService';
import { CourseEligibilityClassifier } from '../CourseEligibilityClassifier';
import { CourseCursorPaginationService } from '../CourseCursorPaginationService';
import { CourseResponseMapper } from '../../../../mappings/search/CourseResponseMapper';
import {
  SearchCacheKeyBuilder,
  SearchResultsKeyParams,
} from '../cache/SearchCacheKeyBuilder';

/**
 * Parameters for executing the search pipeline
 */
export interface PipelineParams {
  /** Search text (optional) */
  searchText?: string;
  /** ID-based filters (optional) */
  filters?: SearchFiltersDto;
  /** Range filters (optional) */
  ranges?: SearchRangesDto;
  /** Boolean flags (optional) */
  flags?: SearchFlagsDto;
  /** Pagination cursor (optional) */
  cursor?: string;
  /** Page limit (optional) */
  limit?: number;
  /** List type filter */
  listType: ListType;
  /** User search context */
  context: SearchContext;
}

/**
 * Candidate with commission score (for DB-level ranking)
 */
interface CandidateWithScore {
  id: string;
  commissionScore: number;
}

/**
 * Search Pipeline Executor
 *
 * Implements a 3-phase search pipeline for optimized performance:
 *
 * **Phase 1: Candidate Selection (Lightweight)**
 * - Selects only course intake IDs that match search criteria
 * - Minimal joins (no relation data loaded)
 * - Hard limit of 2000 candidates to prevent memory issues
 * - For anonymous users: includes DB-level commission ranking
 *
 * **Phase 2: Hydration (Targeted)**
 * - Loads full entity data only for Phase 1 candidates
 * - Includes all relations needed for response mapping
 * - Preserves order from Phase 1 (important for DB-ranked results)
 *
 * **Phase 3: In-Memory Processing**
 * - Ranking (skipped for anonymous users if DB-ranked)
 * - Eligibility classification
 * - ListType filtering (ELIGIBLE_ONLY, INELIGIBLE_ONLY, ALL)
 * - Cursor pagination
 *
 * **Caching:**
 * - Results cached in Redis with 5-minute TTL
 * - Different cache entries per ranking mode
 * - Fail-open behavior (works without Redis)
 *
 * **Performance Benefits:**
 * - 60%+ reduction in data transfer vs loading all courses
 * - Eliminates in-memory sorting for anonymous users
 * - Enables efficient pagination without loading all data
 */
@Injectable()
export class SearchPipelineExecutor {
  /** Maximum candidates to process (prevents memory issues) */
  private readonly CANDIDATE_LIMIT = 2000;

  /** Commission weight constants (matching CommissionWeightCalculator) */
  private readonly COMMISSION_MULTIPLIER = 100;
  private readonly COMMISSION_MAX_WEIGHT = 5000;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly rankingService: CourseRankingService,
    private readonly eligibilityClassifier: CourseEligibilityClassifier,
    private readonly paginationService: CourseCursorPaginationService,
    private readonly responseMapper: CourseResponseMapper,
    @Inject(ICacheToken)
    private readonly cache: ICacheService,
    @Inject(ILoggerToken)
    private readonly logger: ILogger,
  ) {}

  // =========================================================================
  // Main Entry Point
  // =========================================================================

  /**
   * Execute the search pipeline
   *
   * Automatically chooses optimal execution path:
   * - Anonymous users (BUSINESS_ONLY): DB-level ranking
   * - Logged-in users (ELIGIBILITY_PLUS_BUSINESS): In-memory ranking
   *
   * @param params - Pipeline parameters
   * @returns Search response DTO
   */
  async execute(params: PipelineParams): Promise<SearchResponseDto> {
    const startTime = Date.now();

    // Build cache key
    const cacheKeyParams: SearchResultsKeyParams = {
      searchText: params.searchText,
      filters: params.filters,
      ranges: params.ranges,
      flags: params.flags,
      listType: params.listType,
      rankingMode: params.context.rankingMode,
      cursor: params.cursor,
      limit: params.limit,
    };

    const cacheKey = SearchCacheKeyBuilder.forSearchResults(cacheKeyParams);

    this.logger.LogDebug('params', {
      context: 'SearchPipelineExecutor.execute',
      listType: params.listType,
      rankingMode: params.context.rankingMode,
      leadId: params.context.normalizedProfile?.leadId,
      academicResultsByDegreeId: Object.fromEntries(params.context.normalizedProfile?.academicResultsByDegreeId ?? []),
      englishResultsByTestId: Object.fromEntries(params.context.normalizedProfile?.englishResultsByTestId ?? []),
      preferredCountryIds: [...(params.context.normalizedProfile?.preferredCountryIds ?? [])],
      preferredProgrammeIds: [...(params.context.normalizedProfile?.preferredProgrammeIds ?? [])],
    });

    // Try to get from cache
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Determine execution path
        const canUseDbRanking = this.canUseDbRanking(params);

        const result = canUseDbRanking
          ? await this.executeWithDbRanking(params)
          : await this.executeWithInMemoryRanking(params);

        this.logger.debug?.('Pipeline execution complete', {
          context: 'SearchPipelineExecutor.execute',
          executionPath: canUseDbRanking ? 'DB_RANKING' : 'MEMORY_RANKING',
          elapsedMs: Date.now() - startTime,
          resultCount: result.courses.length,
        });

        return result;
      },
      SearchCacheKeyBuilder.TTL.SEARCH_RESULTS,
    );
  }

  /**
   * Determine if DB-level ranking can be used
   *
   * DB ranking is applicable when user is in BUSINESS_ONLY mode
   * (anonymous or incomplete profile). In this mode, only commission
   * affects ranking, which can be computed efficiently in the database.
   */
  private canUseDbRanking(params: PipelineParams): boolean {
    return params.context.rankingMode === RankingMode.BUSINESS_ONLY;
  }

  // =========================================================================
  // DB Ranking Path (Anonymous Users)
  // =========================================================================

  /**
   * Execute pipeline with DB-level commission ranking
   *
   * Optimized for anonymous users where only commission affects ranking.
   * Sorting is done in the database, eliminating in-memory sorting.
   */
  private async executeWithDbRanking(
    params: PipelineParams,
  ): Promise<SearchResponseDto> {
    // Phase 1: Get candidate IDs with commission scores (sorted by DB)
    const candidates = await this.getCandidateIdsWithCommissionRanking(params);

    if (candidates.length === 0) {
      return this.responseMapper.toEmptyResponse(
        params.context,
        params.listType,
      );
    }

    // Phase 2: Hydrate (preserving order)
    const hydrated = await this.hydrateByIdsPreservingOrder(
      candidates.map((c) => c.id),
    );

    // Phase 3: Minimal processing (no ranking needed!)
    // Build ranked courses with scores from DB
    const scoreMap = new Map(candidates.map((c) => [c.id, c.commissionScore]));
    const rankedCourses: RankedCourse[] = hydrated.map((courseIntake) => ({
      courseIntake,
      rankScore: scoreMap.get(courseIntake.id) ?? 0,
      isEligible: true, // Anonymous users: all courses shown as eligible
    }));

    // Apply pagination (eligibility classifier skipped for anonymous)
    const paginated = this.paginationService.applyPagination(
      rankedCourses,
      params.cursor,
      params.limit,
    );

    this.logger.LogDebug('Pipeline execution complete', {
      context: 'SearchPipelineExecutor.executeWithDbRanking',
      executionPath: 'DB_RANKING',
      paginatedCourses: paginated.items.map((c) => ({
        courseName: c.courseIntake.UniCourse.courseName,
        universityName: c.courseIntake.UniCourse.SysUniversity.uniName,
        score: c.rankScore,
      })),
    });

    return this.responseMapper.toSearchResponse(
      params.context,
      paginated,
      params.listType,
    );
  }

  /**
   * Phase 1 (DB Ranking): Get candidate IDs with commission scores
   *
   * Sorts by commission score in the database, eliminating need for
   * in-memory sorting. Uses same formula as CommissionWeightCalculator.
   */
  private async getCandidateIdsWithCommissionRanking(
    params: PipelineParams,
  ): Promise<CandidateWithScore[]> {
    let query = this.dataSource
      .createQueryBuilder(UniCourseIntakes, 'ci')
      .select('ci.id', 'id')
      .addSelect(
        `CASE 
          WHEN COALESCE(uni."commissionType", '${CommissionType.AMOUNT}') = '${CommissionType.AMOUNT}' 
            THEN LEAST(COALESCE(CAST(uni.commission AS DECIMAL), 0), ${this.COMMISSION_MAX_WEIGHT})
          ELSE 
            LEAST(COALESCE(CAST(uni.commission AS DECIMAL), 0) * ${this.COMMISSION_MULTIPLIER}, ${this.COMMISSION_MAX_WEIGHT})
        END`,
        'commissionScore',
      )
      .innerJoin('ci.UniCourse', 'course')
      .innerJoin('course.SysUniversity', 'uni')
      .innerJoin('uni.SysCountry', 'country')
      .innerJoin('ci.UniIntake', 'uniIntake')
      .innerJoin('uniIntake.SysIntake', 'sysIntake')
      .where('ci.isActive = :isActive', { isActive: true });

    // Apply filters
    query = this.applyFilters(query, params);

    // Sort by commission score (DB-level ranking!)
    query
      .orderBy('"commissionScore"', 'DESC')
      .addOrderBy('ci.id', 'ASC') // Tie-breaker
      .limit(this.CANDIDATE_LIMIT);

    const results = await query.getRawMany<{ id: string; commissionScore: string }>();

    return results.map((r) => ({
      id: r.id,
      commissionScore: parseFloat(r.commissionScore) || 0,
    }));
  }

  // =========================================================================
  // In-Memory Ranking Path (Logged-In Users)
  // =========================================================================

  /**
   * Execute pipeline with in-memory ranking
   *
   * Used for logged-in users where eligibility and preference
   * matching affect ranking. Full ranking happens in memory.
   */
  private async executeWithInMemoryRanking(
    params: PipelineParams,
  ): Promise<SearchResponseDto> {
    // Phase 1: Get candidate IDs
    const candidateIds = await this.getCandidateIds(params);

    if (candidateIds.length === 0) {
      return this.responseMapper.toEmptyResponse(
        params.context,
        params.listType,
      );
    }

    // Phase 2: Hydrate
    const hydrated = await this.hydrateByIds(candidateIds);

    // Phase 3: Full in-memory processing
    // 3a. Apply weight-based ranking
    const rankedCourses = this.rankingService.rankCourses(
      hydrated,
      params.context,
    );

    // 3b. Classify eligibility
    const classifiedCourses = this.eligibilityClassifier.classify(
      rankedCourses,
      params.context,
    );

    // 3c. Filter by listType
    const filteredCourses = this.filterByListType(
      classifiedCourses,
      params.listType,
    );

    // 3d. Apply pagination
    const paginated = this.paginationService.applyPagination(
      filteredCourses,
      params.cursor,
      params.limit,
    );

    return this.responseMapper.toSearchResponse(
      params.context,
      paginated,
      params.listType,
    );
  }

  /**
   * Phase 1 (Memory Ranking): Get candidate IDs without scores
   *
   * Returns only IDs; scoring/ranking happens in-memory.
   * Default ordering is by createdAt (newest first) as a baseline,
   * but the final order is determined by the ranking service.
   */
  private async getCandidateIds(params: PipelineParams): Promise<string[]> {
    let query = this.dataSource
      .createQueryBuilder(UniCourseIntakes, 'ci')
      .select('ci.id', 'id')
      .innerJoin('ci.UniCourse', 'course')
      .innerJoin('course.SysUniversity', 'uni')
      .innerJoin('uni.SysCountry', 'country')
      .innerJoin('ci.UniIntake', 'uniIntake')
      .innerJoin('uniIntake.SysIntake', 'sysIntake')
      .where('ci.isActive = :isActive', { isActive: true });

    // Apply filters
    query = this.applyFilters(query, params);

    // Default ordering (will be re-sorted by ranking in memory)
    query
      .orderBy('ci.createdAt', 'DESC')
      .addOrderBy('ci.id', 'ASC')
      .limit(this.CANDIDATE_LIMIT);

    const results = await query.getRawMany<{ id: string }>();
    return results.map((r) => r.id);
  }

  // =========================================================================
  // Phase 2: Hydration
  // =========================================================================

  /**
   * Phase 2: Load full entity data for candidate IDs
   *
   * Includes all relations needed for:
   * - Response mapping (CourseResponseMapper)
   * - Eligibility classification (CourseEligibilityClassifier)
   * - Ranking (WeightCalculators)
   */
  private async hydrateByIds(
    candidateIds: string[],
  ): Promise<UniCourseIntakes[]> {
    if (candidateIds.length === 0) {
      return [];
    }

    return (
      this.dataSource
        .createQueryBuilder(UniCourseIntakes, 'ci')
        // Course info
        .innerJoinAndSelect('ci.UniCourse', 'course')
        // University info (including commission for ranking)
        .innerJoinAndSelect('course.SysUniversity', 'uni')
        .innerJoinAndSelect('uni.SysCountry', 'country')
        .leftJoinAndSelect('uni.SysState', 'state')
        .leftJoinAndSelect('uni.SysCity', 'city')
        // Intake info
        .innerJoinAndSelect('ci.UniIntake', 'uniIntake')
        .innerJoinAndSelect('uniIntake.SysIntake', 'sysIntake')
        // Scholarships (for response - only active)
        .leftJoinAndSelect(
          'ci.CourseIntakeScholarship',
          'scholarships',
          'scholarships.isActive = :scholarshipActive',
          { scholarshipActive: true },
        )
        // English requirements (for eligibility)
        .leftJoinAndSelect('course.CourseEngReq', 'engReqs')
        .leftJoinAndSelect('engReqs.SysEnglishTest', 'engTest')
        // Academic degree requirement (for eligibility)
        .leftJoinAndSelect('course.minSysAcademicDegree', 'minDegree')
        // Filter to only our candidates
        .where('ci.id IN (:...candidateIds)', { candidateIds })
        .getMany()
    );
  }

  /**
   * Phase 2 (DB Ranking): Hydrate preserving order from Phase 1
   *
   * When using DB-level ranking, the order from Phase 1 must be preserved.
   * This method ensures hydrated results match the original order.
   */
  private async hydrateByIdsPreservingOrder(
    orderedIds: string[],
  ): Promise<UniCourseIntakes[]> {
    if (orderedIds.length === 0) {
      return [];
    }

    // Hydrate (order not guaranteed)
    const hydrated = await this.hydrateByIds(orderedIds);

    // Create lookup map
    const byId = new Map(hydrated.map((c) => [c.id, c]));

    // Restore original order
    return orderedIds
      .map((id) => byId.get(id))
      .filter((c): c is UniCourseIntakes => c !== undefined);
  }

  // =========================================================================
  // Filter Application
  // =========================================================================

  /**
   * Apply all filters to query
   */
  private applyFilters(
    query: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    // Text search
    if (params.searchText?.trim()) {
      const pattern = `%${params.searchText.trim()}%`;
      query.andWhere(
        new Brackets((qb) => {
          qb.where('course.courseName ILIKE :searchPattern', {
            searchPattern: pattern,
          })
            .orWhere('uni.uniName ILIKE :searchPattern', {
              searchPattern: pattern,
            })
            .orWhere('country.countryName ILIKE :searchPattern', {
              searchPattern: pattern,
            });
        }),
      );
    }

    // ID filters
    if (params.filters) {
      const f = params.filters;

      if (f.countryIds?.length) {
        query.andWhere('uni.sysCountryId IN (:...countryIds)', {
          countryIds: f.countryIds,
        });
      }

      if (f.cityIds?.length) {
        query.andWhere('uni.sysCityId IN (:...cityIds)', {
          cityIds: f.cityIds,
        });
      }

      if (f.programmeIds?.length) {
        query.andWhere('course.sysProgrammeId IN (:...programmeIds)', {
          programmeIds: f.programmeIds,
        });
      }

      if (f.intakeIds?.length) {
        query.andWhere('sysIntake.id IN (:...intakeIds)', {
          intakeIds: f.intakeIds,
        });
      }

      if (f.intakeYear !== undefined) {
        query.andWhere('ci.intakeYear = :intakeYear', {
          intakeYear: f.intakeYear,
        });
      }
    }

    // Range filters
    if (params.ranges) {
      const r = params.ranges;

      if (r.tuitionFee?.min !== undefined) {
        query.andWhere(
          'CAST(ci.tuitionFee AS DECIMAL) >= :minTuitionFee',
          { minTuitionFee: r.tuitionFee.min },
        );
      }

      if (r.tuitionFee?.max !== undefined) {
        query.andWhere(
          'CAST(ci.tuitionFee AS DECIMAL) <= :maxTuitionFee',
          { maxTuitionFee: r.tuitionFee.max },
        );
      }

      if (r.durationMonths?.min !== undefined) {
        query.andWhere('ci.courseDuration >= :minDuration', {
          minDuration: r.durationMonths.min,
        });
      }

      if (r.durationMonths?.max !== undefined) {
        query.andWhere('ci.courseDuration <= :maxDuration', {
          maxDuration: r.durationMonths.max,
        });
      }
    }

    // Flag filters
    if (params.flags?.hasScholarship === true) {
      query.andWhere(
        `EXISTS (
          SELECT 1 FROM "CourseIntakeScholarships" sch 
          WHERE sch."courseIntakeId" = ci.id 
          AND sch."isActive" = true
        )`,
      );
    }

    return query;
  }

  // =========================================================================
  // Phase 3 Helpers
  // =========================================================================

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
