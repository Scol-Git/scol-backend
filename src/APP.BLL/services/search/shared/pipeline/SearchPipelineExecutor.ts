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
  CursorData,
  PaginatedResult,
} from '@shared/search/SearchTypes';
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
 * Row from Phase-1 DB-driven ranking (logged-in path)
 */
interface RankedCandidateRow {
  courseIntakeId: string;
  rankScore: number;
  isEligible: boolean;
}

/** Weight constants matching WeightCalculatorRegistry (exact 1:1) */
const ACADEMIC_WEIGHT = 5000;
const ENGLISH_WEIGHT = 3000;
const COUNTRY_PREFERENCE_WEIGHT = 1500;
const PROGRAMME_PREFERENCE_WEIGHT = 1500;

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
  /** Commission weight constants (matching CommissionWeightCalculator) */
  private readonly COMMISSION_MULTIPLIER = 100;
  private readonly COMMISSION_MAX_WEIGHT = 5000;

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
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

    // Build cache key from full relevant user context (identity + profile data that affects ranking/eligibility)
    const cacheKeyParams: SearchResultsKeyParams = {
      userContext: SearchCacheKeyBuilder.fromSearchContext(params.context),
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
      academicResultsByDegreeId: Object.fromEntries(
        params.context.normalizedProfile?.academicResultsByDegreeId ?? [],
      ),
      englishResultsByTestId: Object.fromEntries(
        params.context.normalizedProfile?.englishResultsByTestId ?? [],
      ),
      preferredCountryIds: [
        ...(params.context.normalizedProfile?.preferredCountryIds ?? []),
      ],
      preferredProgrammeIds: [
        ...(params.context.normalizedProfile?.preferredProgrammeIds ?? []),
      ],
    });

    // Try to get from cache
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        // Determine execution path
        const canUseDbRanking = this.canUseDbRanking(params);

        const result = canUseDbRanking
          ? await this.executeWithDbRanking(params)
          : await this.executeWithDbDrivenRanking(params);

        this.logger.debug?.('Pipeline execution complete', {
          context: 'SearchPipelineExecutor.execute',
          executionPath: canUseDbRanking ? 'DB_RANKING' : 'DB_DRIVEN_RANKING',
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
   * Execute pipeline with DB-level commission ranking (anonymous users)
   *
   * Cursor and limit applied in SQL; only the page IDs are hydrated.
   */
  private async executeWithDbRanking(
    params: PipelineParams,
  ): Promise<SearchResponseDto> {
    const effectiveLimit = this.paginationService.getEffectiveLimit(
      params.limit,
    );
    const limitPlusOne = effectiveLimit + 1;

    const cursorData: CursorData | null = params.cursor
      ? this.paginationService.decodeCursor(params.cursor)
      : null;
    const cursorScore = cursorData !== null ? cursorData.rankScore : null;
    const cursorId = cursorData !== null ? cursorData.courseIntakeId : null;

    const candidates = await this.getCandidateIdsWithCommissionRanking(
      params,
      cursorScore,
      cursorId,
      limitPlusOne,
    );

    if (candidates.length === 0) {
      return this.responseMapper.toEmptyResponse(
        params.context,
        params.listType,
      );
    }

    const hydrated = await this.hydrateByIdsPreservingOrder(
      candidates.map((c) => c.id),
    );
    const scoreMap = new Map(candidates.map((c) => [c.id, c.commissionScore]));
    const rankedCourses: RankedCourse[] = hydrated.map((courseIntake) => ({
      courseIntake,
      rankScore: scoreMap.get(courseIntake.id) ?? 0,
      isEligible: true,
    }));

    const paginated: PaginatedResult<RankedCourse> =
      this.paginationService.buildPaginatedResult(rankedCourses, params.limit);

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
   * Phase 1 (DB Ranking): Get candidate IDs with commission scores, cursor and limit in SQL.
   * Wrapped in subquery so cursor/ORDER BY use computed column (no alias-in-WHERE bug). rankScore as integer.
   */
  private async getCandidateIdsWithCommissionRanking(
    params: PipelineParams,
    cursorScore: number | null,
    cursorId: string | null,
    limitPlusOne: number,
  ): Promise<CandidateWithScore[]> {
    const commissionExpr = `(CASE
      WHEN COALESCE(uni."commissionType", '${CommissionType.AMOUNT}') = '${CommissionType.AMOUNT}'
      THEN LEAST(COALESCE(CAST(uni.commission AS DECIMAL), 0), ${this.COMMISSION_MAX_WEIGHT})
      ELSE LEAST(COALESCE(CAST(uni.commission AS DECIMAL), 0) * ${this.COMMISSION_MULTIPLIER}, ${this.COMMISSION_MAX_WEIGHT})
      END)`;

    let innerQb = this.dataSource
      .createQueryBuilder(UniCourseIntakes, 'ci')
      .select('ci.id', 'id')
      .addSelect(commissionExpr, 'commissionScore')
      .innerJoin('ci.UniCourse', 'course')
      .innerJoin('course.SysUniversity', 'uni')
      .innerJoin('uni.SysCountry', 'country')
      .innerJoin('ci.UniIntake', 'uniIntake')
      .innerJoin('uniIntake.SysIntake', 'sysIntake')
      .where('ci.isActive = :isActive', { isActive: true });

    innerQb = this.applyFilters(innerQb, params);
    const innerSql = innerQb.getQuery();
    const innerParams = innerQb.getParameters();

    let outerQb = this.dataSource
      .createQueryBuilder()
      .select('sub.id', 'id')
      .addSelect('sub."commissionScore"', 'commissionScore')
      .from(`(${innerSql})`, 'sub')
      .setParameters(innerParams);

    if (cursorScore !== null && cursorId !== null) {
      outerQb = outerQb.andWhere(
        '(sub."commissionScore", sub.id) < (:cursorScore, :cursorId)',
        { cursorScore: Math.floor(Number(cursorScore)), cursorId },
      );
    }
    outerQb = outerQb
      .orderBy('sub."commissionScore"', 'DESC')
      .addOrderBy('sub.id', 'ASC')
      .limit(limitPlusOne);

    const results = await outerQb.getRawMany<{
      id: string;
      commissionScore: string;
    }>();

    return results.map((r) => ({
      id: r.id,
      commissionScore: parseInt(r.commissionScore, 10) || 0,
    }));
  }

  // =========================================================================
  // In-Memory Ranking Path (Logged-In Users)
  // =========================================================================

  /**
   * Execute pipeline with DB-driven ranking (logged-in users)
   *
   * Eligibility, ranking, listType filter, and cursor pagination are done in SQL.
   * Phase-2 hydrates only the final page IDs (limit+1).
   */
  private async executeWithDbDrivenRanking(
    params: PipelineParams,
  ): Promise<SearchResponseDto> {
    const effectiveLimit = this.paginationService.getEffectiveLimit(
      params.limit,
    );
    const limitPlusOne = effectiveLimit + 1;

    const cursorData: CursorData | null = params.cursor
      ? this.paginationService.decodeCursor(params.cursor)
      : null;
    const cursorScore = cursorData !== null ? cursorData.rankScore : null;
    const cursorId = cursorData !== null ? cursorData.courseIntakeId : null;

    const rows = await this.getRankedCandidatesDbDriven(
      params,
      cursorScore,
      cursorId,
      limitPlusOne,
    );

    if (rows.length === 0) {
      return this.responseMapper.toEmptyResponse(
        params.context,
        params.listType,
      );
    }

    const pageIds = rows.map((r) => r.courseIntakeId);
    const hydrated = await this.hydrateByIdsPreservingOrder(pageIds);
    const scoreMap = new Map(rows.map((r) => [r.courseIntakeId, r]));
    const rankedCourses: RankedCourse[] = hydrated.map((courseIntake) => {
      const row = scoreMap.get(courseIntake.id)!;
      return {
        courseIntake,
        rankScore: row.rankScore,
        isEligible: row.isEligible,
      };
    });

    const paginated: PaginatedResult<RankedCourse> =
      this.paginationService.buildPaginatedResult(rankedCourses, params.limit);

    this.logger.LogDebug('Pipeline execution complete', {
      context: 'SearchPipelineExecutor.executeWithDbDrivenRanking',
      executionPath: 'DB_DRIVEN_RANKING',
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
   * Phase 1 (DB-driven, logged-in): Optimized 3-level query.
   * L1: Compute each score ONCE (no repeated EXISTS). L2: rankScore as BIGINT, eligible from columns. L3: listType + cursor + ORDER + LIMIT.
   * Matches WeightCalculatorRegistry and CourseEligibilityClassifier 1:1. rankScore is integer for cursor safety.
   */
  private async getRankedCandidatesDbDriven(
    params: PipelineParams,
    cursorScore: number | null,
    cursorId: string | null,
    limitPlusOne: number,
  ): Promise<RankedCandidateRow[]> {
    const leadId = params.context.normalizedProfile?.leadId;
    if (!leadId) {
      return [];
    }

    const rankingMode = params.context.rankingMode;
    const listTypeEligible =
      params.listType === ListType.ELIGIBLE_ONLY
        ? true
        : params.listType === ListType.INELIGIBLE_ONLY
          ? false
          : null;

    // Academic: min degree first (degree exists AND (minGpa NULL OR gpa >= minGpa)); only if that fails, try higher degree (AcademicMatchWeightCalculator 1:1)
    const academicExpr = `(CASE
      WHEN :rankingMode <> '${RankingMode.ELIGIBILITY_PLUS_BUSINESS}' THEN 0
      WHEN course."minSysDegreeId" IS NULL THEN ${ACADEMIC_WEIGHT}
      WHEN EXISTS (
        SELECT 1 FROM "LeadAcademicResults" lar
        WHERE lar.lead_id = :leadId AND lar.degree_id = course."minSysDegreeId"
        AND (course."minGpa" IS NULL OR CAST(lar.gpa AS DECIMAL) >= CAST(course."minGpa" AS DECIMAL))
      ) THEN ${ACADEMIC_WEIGHT}
      WHEN course."higherSysDegreeId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "LeadAcademicResults" lar2
        WHERE lar2.lead_id = :leadId AND lar2.degree_id = course."higherSysDegreeId"
        AND (course."higherGpa" IS NULL OR CAST(lar2.gpa AS DECIMAL) >= CAST(course."higherGpa" AS DECIMAL))
      ) THEN ${ACADEMIC_WEIGHT}
      ELSE 0 END)`;

    // English: no reqs → 3000; else any req satisfied (overallScore >= minOverallReq AND section check when minSectionReq exists)
    const englishExpr = `(CASE
      WHEN :rankingMode <> '${RankingMode.ELIGIBILITY_PLUS_BUSINESS}' THEN 0
      WHEN NOT EXISTS (SELECT 1 FROM "CourseEngReq" cer WHERE cer."uniCourseId" = course.id) THEN ${ENGLISH_WEIGHT}
      WHEN EXISTS (
        SELECT 1 FROM "CourseEngReq" cer
        INNER JOIN "LeadEnglishTestResults" letr ON letr."leadId" = :leadId AND letr."sysEngTestId" = cer."sysEngTestId"
          AND CAST(letr."overallScore" AS DECIMAL) >= CAST(COALESCE(cer."minOverallReq", 0) AS DECIMAL)
        WHERE cer."uniCourseId" = course.id
        AND (
          cer."minSectionReq" IS NULL
          OR (
            EXISTS (SELECT 1 FROM "LeadEnglishTestSectionResults" sec WHERE sec."resultId" = letr.id)
            AND NOT EXISTS (
              SELECT 1 FROM "LeadEnglishTestSectionResults" sec2
              WHERE sec2."resultId" = letr.id
              AND CAST(sec2."sectionScore" AS DECIMAL) < CAST(cer."minSectionReq" AS DECIMAL)
            )
          )
        )
      ) THEN ${ENGLISH_WEIGHT}
      ELSE 0 END)`;

    const preferenceExpr = `(CASE
      WHEN :rankingMode <> '${RankingMode.ELIGIBILITY_PLUS_BUSINESS}' THEN 0
      ELSE
        (CASE WHEN EXISTS (SELECT 1 FROM "LeadPreferredCountries" lpc WHERE lpc.lead_id = :leadId AND lpc.country_id = uni."sysCountryId") THEN ${COUNTRY_PREFERENCE_WEIGHT} ELSE 0 END)
        + (CASE WHEN EXISTS (SELECT 1 FROM "LeadPreferredPrograms" lpp WHERE lpp.lead_id = :leadId AND lpp.programme_id = course."sysProgrammeId") THEN ${PROGRAMME_PREFERENCE_WEIGHT} ELSE 0 END)
      END)`;

    const commissionExpr = `(CASE
      WHEN COALESCE(uni."commissionType", '${CommissionType.AMOUNT}') = '${CommissionType.AMOUNT}'
      THEN LEAST(COALESCE(CAST(uni.commission AS DECIMAL), 0), ${this.COMMISSION_MAX_WEIGHT})
      ELSE LEAST(COALESCE(CAST(uni.commission AS DECIMAL), 0) * ${this.COMMISSION_MULTIPLIER}, ${this.COMMISSION_MAX_WEIGHT})
      END)`;

    // L1: scores computed once (no inlining)
    let l1 = this.dataSource
      .createQueryBuilder(UniCourseIntakes, 'ci')
      .select('ci.id', 'courseIntakeId')
      .addSelect(academicExpr, 'academicScore')
      .addSelect(englishExpr, 'englishScore')
      .addSelect(preferenceExpr, 'preferenceScore')
      .addSelect(commissionExpr, 'commissionScore')
      .innerJoin('ci.UniCourse', 'course')
      .innerJoin('course.SysUniversity', 'uni')
      .innerJoin('uni.SysCountry', 'country')
      .innerJoin('ci.UniIntake', 'uniIntake')
      .innerJoin('uniIntake.SysIntake', 'sysIntake')
      .where('ci.isActive = :isActive', { isActive: true })
      .setParameter('leadId', leadId)
      .setParameter('rankingMode', rankingMode);

    l1 = this.applyFilters(l1, params);
    const l1Sql = l1.getQuery();
    const l1Params = l1.getParameters();

    // L2: rankScore as BIGINT (deterministic cursor), eligible from columns
    const l2Qb = this.dataSource
      .createQueryBuilder()
      .select('s1."courseIntakeId"', 'courseIntakeId')
      .addSelect(
        'CAST(s1."academicScore" + s1."englishScore" + s1."preferenceScore" + s1."commissionScore" AS BIGINT)',
        'rankScore',
      )
      .addSelect(
        '(s1."academicScore" > 0 AND s1."englishScore" > 0)',
        'eligible',
      )
      .from(`(${l1Sql})`, 's1')
      .setParameters(l1Params);

    const l2Sql = l2Qb.getQuery();
    const l2Params = l2Qb.getParameters();

    // L3: listType (BEFORE LIMIT), cursor, ORDER BY rankScore DESC, courseIntakeId ASC, LIMIT+1
    let l3 = this.dataSource
      .createQueryBuilder()
      .select('s2."courseIntakeId"', 'courseIntakeId')
      .addSelect('s2."rankScore"', 'rankScore')
      .addSelect('s2.eligible', 'eligible')
      .from(`(${l2Sql})`, 's2')
      .setParameters(l2Params);

    if (listTypeEligible !== null) {
      l3 = l3.andWhere('s2.eligible = :listTypeEligible', {
        listTypeEligible,
      });
    }
    if (cursorScore !== null && cursorId !== null) {
      l3 = l3.andWhere(
        '(s2."rankScore", s2."courseIntakeId") < (:cursorScore, :cursorId)',
        { cursorScore: Math.floor(Number(cursorScore)), cursorId },
      );
    }
    l3 = l3
      .orderBy('s2."rankScore"', 'DESC')
      .addOrderBy('s2."courseIntakeId"', 'ASC')
      .limit(limitPlusOne);

    const rows = await l3.getRawMany<{
      courseIntakeId: string;
      rankScore: string;
      eligible: boolean;
    }>();

    return rows.map((r) => ({
      courseIntakeId: r.courseIntakeId,
      rankScore: parseInt(r.rankScore, 10) || 0,
      isEligible: r.eligible,
    }));
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
        query.andWhere('CAST(ci.tuitionFee AS DECIMAL) >= :minTuitionFee', {
          minTuitionFee: r.tuitionFee.min,
        });
      }

      if (r.tuitionFee?.max !== undefined) {
        query.andWhere('CAST(ci.tuitionFee AS DECIMAL) <= :maxTuitionFee', {
          maxTuitionFee: r.tuitionFee.max,
        });
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
}
