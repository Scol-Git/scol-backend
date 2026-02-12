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
 * Parameters for executing the search pipeline.
 */
export interface PipelineParams {
  searchText?: string;
  filters?: SearchFiltersDto;
  ranges?: SearchRangesDto;
  flags?: SearchFlagsDto;
  cursor?: string;
  limit?: number;
  listType: ListType;
  context: SearchContext;
}

/**
 * Pre-computed intake window bounds, calculated once per request.
 * Stores both the raw year/month bounds (for index-friendly WHERE)
 * and the integer key (for DISTINCT ON ordering only).
 */
interface IntakeWindow {
  /** Minimum year (inclusive). */
  minYear: number;
  /** Minimum month (inclusive, 1–12). */
  minMonth: number;
  /** Maximum year (inclusive). */
  maxYear: number;
  /** Maximum month (inclusive, 1–12). */
  maxMonth: number;
  /** Integer key for min bound (year*12+month) — used in DISTINCT ON ORDER BY only. */
  nowKey: number;
}

/** Candidate with commission score (DB ranking). */
interface CandidateWithScore {
  id: string;
  commissionScore: number;
}

/** Row from DB-driven eligibility ranking (logged-in). */
interface RankedCandidateRow {
  courseIntakeId: string;
  rankScore: number;
  isEligible: boolean;
}

/** Preference weights */
const COUNTRY_PREFERENCE_WEIGHT = 1500;
const PROGRAMME_PREFERENCE_WEIGHT = 1500;

/** Default horizon (months ahead) for next-intake rule. */
const DEFAULT_MAX_MONTHS_AHEAD = 9;

/** Quoted alias so PostgreSQL matches TypeORM-generated "sysIntake" (case-sensitive). */
const INTAKE_MONTH_COL = '"sysIntake"."intakeMonth"';

/** SQL expression: integer key for (year, month) comparison. */
const INTAKE_MONTH_EXPR = `COALESCE(${INTAKE_MONTH_COL}, 1)`;
const INTAKE_KEY_EXPR = `(COALESCE(ci.intakeYear, 0) * 12 + ${INTAKE_MONTH_EXPR})`;

@Injectable()
export class SearchPipelineExecutor {
  /** Commission constants */
  private readonly COMMISSION_MULTIPLIER = 100;
  private readonly COMMISSION_MAX_WEIGHT = 5000;

  /** Max months ahead for next-intake window. */
  private readonly maxMonthsAhead: number = DEFAULT_MAX_MONTHS_AHEAD;

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
  // MAIN ENTRY
  // =========================================================================

  async execute(params: PipelineParams): Promise<SearchResponseDto> {
    const startTime = Date.now();

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

    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const useDbRanking = this.canUseDbRanking(params);
        const intakeWindow = this.computeIntakeWindow();

        const result = useDbRanking
          ? await this.executeWithDbRanking(params, intakeWindow)
          : await this.executeWithDbDrivenRanking(params, intakeWindow);

        this.logger.LogDebug('Pipeline execution complete', {
          context: 'SearchPipelineExecutor.execute',
          executionPath: useDbRanking ? 'DB_RANKING' : 'DB_DRIVEN_RANKING',
          elapsedMs: Date.now() - startTime,
          resultCount: result.courses.length,
        });

        return result;
      },
      SearchCacheKeyBuilder.TTL.SEARCH_RESULTS,
    );
  }

  // =========================================================================
  // DECISION HELPERS
  // =========================================================================

  /**
   * DB Ranking applies when:
   * - BUSINESS_ONLY mode
   * - OR leadId missing (fallback to commission-only)
   */
  private canUseDbRanking(params: PipelineParams): boolean {
    return (
      params.context.rankingMode === RankingMode.BUSINESS_ONLY ||
      !params.context.normalizedProfile?.leadId
    );
  }

  /** Whether to apply the next-intake horizon (no intake filters set by user). */
  private shouldApplyNextIntakeRule(params: PipelineParams): boolean {
    const f = params.filters;
    return !f?.intakeIds?.length && f?.intakeYear === undefined;
  }

  // =========================================================================
  // SHARED HELPERS
  // =========================================================================

  /** Compute intake window bounds once per request. */
  private computeIntakeWindow(): IntakeWindow {
    const now = new Date();
    const minYear = now.getFullYear();
    const minMonth = now.getMonth() + 1; // 1-based

    const maxKey = minYear * 12 + minMonth + this.maxMonthsAhead;
    const maxYear = Math.floor((maxKey - 1) / 12);
    const maxMonth = ((maxKey - 1) % 12) + 1;

    return {
      minYear,
      minMonth,
      maxYear,
      maxMonth,
      nowKey: minYear * 12 + minMonth,
    };
  }

  private getSqlPagination(params: PipelineParams): {
    effectiveLimit: number;
    limitPlusOne: number;
  } {
    const effectiveLimit = this.paginationService.getEffectiveLimit(
      params.limit,
    );
    return { effectiveLimit, limitPlusOne: effectiveLimit + 1 };
  }

  private getCursor(params: PipelineParams): {
    cursorRank: number | null;
    cursorCourseIntakeId: string | null;
  } {
    const cursorData: CursorData | null = params.cursor
      ? this.paginationService.decodeCursor(params.cursor)
      : null;

    return {
      cursorRank: cursorData?.rankScore ?? null,
      cursorCourseIntakeId: cursorData?.courseIntakeId ?? null,
    };
  }

  /** Formats raw SQL for readable debug logging. */
  private formatSqlForLog(sql: string): string {
    return sql
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\s+FROM\s+/gi, '\nFROM ')
      .replace(/\s+WHERE\s+/gi, '\nWHERE ')
      .replace(/\s+INNER JOIN\s+/gi, '\nINNER JOIN ')
      .replace(/\s+LEFT JOIN\s+/gi, '\nLEFT JOIN ')
      .replace(/\s+ORDER BY\s+/gi, '\nORDER BY ')
      .replace(/\s+LIMIT\s+/gi, '\nLIMIT ')
      .replace(/\s+AND\s+/gi, '\n  AND ')
      .replace(/\s+OR\s+/gi, '\n  OR ');
  }

  private logCandidateSql(
    label: string,
    qb: SelectQueryBuilder<any>,
    logContext: string,
  ): void {
    const sqlFormatted = this.formatSqlForLog(qb.getQuery());
    const paramsJson = JSON.stringify(qb.getParameters(), null, 2);
    this.logger.LogDebug(
      `${label}\n\n${sqlFormatted}\n\nParams:\n${paramsJson}`,
      { context: logContext },
    );
  }

  private buildResponseFromCandidates(
    params: PipelineParams,
    rankedCourses: RankedCourse[],
    executionPath: 'DB_RANKING' | 'DB_DRIVEN_RANKING',
  ): SearchResponseDto {
    const paginated: PaginatedResult<RankedCourse> =
      this.paginationService.buildPaginatedResult(rankedCourses, params.limit);

    this.logger.LogDebug('Pipeline result page', {
      context: 'SearchPipelineExecutor.buildResponseFromCandidates',
      executionPath,
      CourseCount: paginated.items.length,
      Courses: paginated.items.map((c) => ({
        courseName: c.courseIntake.UniCourse?.courseName,
        uniName: c.courseIntake.UniCourse?.SysUniversity?.uniName,
        score: c.rankScore,
      })),
    });

    return this.responseMapper.toSearchResponse(
      params.context,
      paginated,
      params.listType,
    );
  }

  // =========================================================================
  // SHARED QUERY BUILDER: base joins + filters + intake window
  // =========================================================================

  /**
   * Builds the base query with:
   *   1. Required joins (course, uni, country, uniIntake, sysIntake)
   *   2. isActive filter
   *   3. User-supplied filters
   *   4. Intake horizon restriction (if applicable)
   *
   * NOTE: Does NOT apply DISTINCT ON or ORDER BY.
   * Callers add SELECT columns, then apply dedup + ranking ordering.
   */
  private buildBaseQuery(
    params: PipelineParams,
    intakeWindow: IntakeWindow,
  ): SelectQueryBuilder<UniCourseIntakes> {
    let qb = this.dataSource
      .createQueryBuilder(UniCourseIntakes, 'ci')
      .innerJoin('ci.UniCourse', 'course')
      .innerJoin('course.SysUniversity', 'uni')
      .innerJoin('uni.SysCountry', 'country')
      .innerJoin('ci.UniIntake', 'uniIntake')
      .innerJoin('uniIntake.SysIntake', 'sysIntake')
      .where('ci.isActive = true');

    // --- User filters ---
    qb = this.applySearchTextFilter(qb, params);
    qb = this.applyLocationFilters(qb, params);
    qb = this.applyProgrammeFilter(qb, params);
    qb = this.applyIntakeFilters(qb, params);
    qb = this.applyScholarshipFlag(qb, params);

    // --- Intake horizon (WHERE only, no DISTINCT ON / ORDER BY) ---
    if (this.shouldApplyNextIntakeRule(params)) {
      qb = this.applyNextIntakeWindow(qb, intakeWindow);
    }

    return qb;
  }

  // =========================================================================
  // PATH 1: DB COMMISSION RANKING (BUSINESS_ONLY or missing leadId)
  // =========================================================================

  private async executeWithDbRanking(
    params: PipelineParams,
    intakeWindow: IntakeWindow,
  ): Promise<SearchResponseDto> {
    if (
      params.listType === ListType.INELIGIBLE_ONLY &&
      params.context.rankingMode === RankingMode.BUSINESS_ONLY
    ) {
      return this.responseMapper.toEmptyResponse(
        params.context,
        params.listType,
      );
    }

    const { limitPlusOne } = this.getSqlPagination(params);
    const { cursorRank, cursorCourseIntakeId } = this.getCursor(params);

    const candidates = await this.getCandidateIdsWithCommissionRanking(
      params,
      intakeWindow,
      cursorRank,
      cursorCourseIntakeId,
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

    return this.buildResponseFromCandidates(
      params,
      rankedCourses,
      'DB_RANKING',
    );
  }

  private async getCandidateIdsWithCommissionRanking(
    params: PipelineParams,
    intakeWindow: IntakeWindow,
    cursorRank: number | null,
    cursorCourseIntakeId: string | null,
    limitPlusOne: number,
  ): Promise<CandidateWithScore[]> {
    const commissionExpr = this.buildCommissionExpr();
    const needsDedup = this.shouldApplyNextIntakeRule(params);

    // --- Inner: filtered candidates + commission score ---
    const innerQb = this.buildBaseQuery(params, intakeWindow);
    innerQb.select('ci.id', 'id').addSelect(commissionExpr, 'commissionScore');

    if (needsDedup) {
      innerQb
        .distinctOn(['course.id'])
        .orderBy('course.id', 'ASC')
        .addOrderBy(INTAKE_KEY_EXPR, 'ASC');
    }

    // --- Outer: ranking + cursor + pagination ---
    const innerSql = innerQb.getQuery();
    const innerParams = innerQb.getParameters();

    let rankQb = this.dataSource
      .createQueryBuilder()
      .select('sub.id', 'id')
      .addSelect('sub."commissionScore"', 'commissionScore')
      .from(`(${innerSql})`, 'sub')
      .setParameters(innerParams);

    if (cursorRank !== null && cursorCourseIntakeId !== null) {
      rankQb = rankQb.andWhere(
        '(sub."commissionScore", sub.id) < (:cursorRank, :cursorCourseIntakeId)',
        {
          cursorRank: Math.floor(cursorRank),
          cursorCourseIntakeId,
        },
      );
    }

    rankQb = rankQb
      .orderBy('sub."commissionScore"', 'DESC')
      .addOrderBy('sub.id', 'ASC')
      .limit(limitPlusOne);

    this.logCandidateSql(
      'Candidate SQL for DB_RANKING',
      rankQb,
      'SearchPipelineExecutor.getCandidateIdsWithCommissionRanking',
    );

    const results = await rankQb.getRawMany<{
      id: string;
      commissionScore: string;
    }>();

    return results.map((r) => ({
      id: r.id,
      commissionScore: parseInt(r.commissionScore, 10) || 0,
    }));
  }

  // =========================================================================
  // PATH 2: DB-DRIVEN ELIGIBILITY + PREFERENCE RANKING (Logged-in)
  // =========================================================================

  private async executeWithDbDrivenRanking(
    params: PipelineParams,
    intakeWindow: IntakeWindow,
  ): Promise<SearchResponseDto> {
    const { limitPlusOne } = this.getSqlPagination(params);
    const { cursorRank, cursorCourseIntakeId } = this.getCursor(params);

    const rows = await this.getRankedCandidatesDbDriven(
      params,
      intakeWindow,
      cursorRank,
      cursorCourseIntakeId,
      limitPlusOne,
    );

    if (rows.length === 0) {
      return this.responseMapper.toEmptyResponse(
        params.context,
        params.listType,
      );
    }

    const orderedIds = rows.map((r) => r.courseIntakeId);
    const hydrated = await this.hydrateByIdsPreservingOrder(orderedIds);
    const rowMap = new Map(rows.map((r) => [r.courseIntakeId, r]));

    const rankedCourses: RankedCourse[] = hydrated.map((ci) => {
      const row = rowMap.get(ci.id)!;
      return {
        courseIntake: ci,
        rankScore: row.rankScore,
        isEligible: row.isEligible,
      };
    });

    return this.buildResponseFromCandidates(
      params,
      rankedCourses,
      'DB_DRIVEN_RANKING',
    );
  }

  private async getRankedCandidatesDbDriven(
    params: PipelineParams,
    intakeWindow: IntakeWindow,
    cursorRank: number | null,
    cursorCourseIntakeId: string | null,
    limitPlusOne: number,
  ): Promise<RankedCandidateRow[]> {
    const leadId = params.context.normalizedProfile?.leadId;
    if (!leadId) return [];

    const listTypeEligible =
      params.listType === ListType.ELIGIBLE_ONLY
        ? true
        : params.listType === ListType.INELIGIBLE_ONLY
          ? false
          : null;

    const commissionExpr = this.buildCommissionExpr();
    const preferenceExpr = this.buildPreferenceExpr();
    const academicExpr = this.buildAcademicEligibilityExpr();
    const englishExpr = this.buildEnglishEligibilityExpr();

    const needsDedup = this.shouldApplyNextIntakeRule(params);

    // ---------------------------
    // Layer 1: base + eligibility + raw scores (scalar only)
    // ---------------------------
    const baseQb = this.buildBaseQuery(params, intakeWindow);

    // Preference LEFT JOINs (replaces correlated EXISTS subqueries)
    baseQb
      .leftJoin(
        'LeadPreferredCountries',
        'lpc',
        'lpc.lead_id = :leadId AND lpc.country_id = uni."sysCountryId"',
      )
      .leftJoin(
        'LeadPreferredPrograms',
        'lpp',
        'lpp.lead_id = :leadId AND lpp.programme_id = course."sysProgrammeId"',
      );

    baseQb
      .select('ci.id', 'courseIntakeId')
      .addSelect(academicExpr, 'academicEligible')
      .addSelect(englishExpr, 'englishEligible')
      .addSelect(preferenceExpr, 'preferenceScore')
      .addSelect(commissionExpr, 'commissionScore')
      .setParameter('leadId', leadId);

    if (needsDedup) {
      baseQb
        .distinctOn(['course.id'])
        .orderBy('course.id', 'ASC')
        .addOrderBy(INTAKE_KEY_EXPR, 'ASC');
    }

    const baseSql = baseQb.getQuery();
    const baseParams = baseQb.getParameters();

    // ---------------------------
    // Layer 2: rankScore + eligible flag
    // ---------------------------
    const scoringQb = this.dataSource
      .createQueryBuilder()
      .select('s1."courseIntakeId"', 'courseIntakeId')
      .addSelect(
        'CAST(s1."preferenceScore" + s1."commissionScore" AS BIGINT)',
        'rankScore',
      )
      .addSelect(
        '(s1."academicEligible" > 0 AND s1."englishEligible" > 0)',
        'eligible',
      )
      .from(`(${baseSql})`, 's1')
      .setParameters(baseParams);

    const scoringSql = scoringQb.getQuery();
    const scoringParams = scoringQb.getParameters();

    // ---------------------------
    // Layer 3: paging + cursor
    // ---------------------------
    let pagingQb = this.dataSource
      .createQueryBuilder()
      .select('s2."courseIntakeId"', 'courseIntakeId')
      .addSelect('s2."rankScore"', 'rankScore')
      .addSelect('s2.eligible', 'eligible')
      .from(`(${scoringSql})`, 's2')
      .setParameters(scoringParams);

    if (listTypeEligible !== null) {
      pagingQb = pagingQb.andWhere('s2.eligible = :listTypeEligible', {
        listTypeEligible,
      });
    }

    if (cursorRank !== null && cursorCourseIntakeId !== null) {
      pagingQb = pagingQb.andWhere(
        '(s2."rankScore", s2."courseIntakeId") < (:cursorRank, :cursorCourseIntakeId)',
        {
          cursorRank: Math.floor(cursorRank),
          cursorCourseIntakeId,
        },
      );
    }

    pagingQb = pagingQb
      .orderBy('s2."rankScore"', 'DESC')
      .addOrderBy('s2."courseIntakeId"', 'ASC')
      .limit(limitPlusOne);

    this.logCandidateSql(
      'Candidate SQL for DB_DRIVEN_RANKING',
      pagingQb,
      'SearchPipelineExecutor.getRankedCandidatesDbDriven',
    );

    const rows = await pagingQb.getRawMany<{
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
  // SQL EXPRESSION BUILDERS
  // =========================================================================

  private buildCommissionExpr(): string {
    return `(CASE
      WHEN COALESCE(uni."commissionType", '${CommissionType.AMOUNT}') = '${CommissionType.AMOUNT}'
      THEN LEAST(COALESCE(CAST(uni."commission" AS DECIMAL), 0), ${this.COMMISSION_MAX_WEIGHT})
      ELSE LEAST(
        COALESCE(CAST(uni."commission" AS DECIMAL), 0) * ${this.COMMISSION_MULTIPLIER},
        ${this.COMMISSION_MAX_WEIGHT}
      )
    END)`;
  }

  /**
   * Preference score expression using LEFT JOIN aliases (lpc, lpp).
   * Callers must add the corresponding LEFT JOINs before using this expression.
   */
  private buildPreferenceExpr(): string {
    return `(
      (CASE WHEN lpc.lead_id IS NOT NULL
        THEN ${COUNTRY_PREFERENCE_WEIGHT} ELSE 0 END)
      +
      (CASE WHEN lpp.lead_id IS NOT NULL
        THEN ${PROGRAMME_PREFERENCE_WEIGHT} ELSE 0 END)
    )`;
  }

  private buildAcademicEligibilityExpr(): string {
    return `(CASE
      WHEN course."minSysDegreeId" IS NULL THEN 1

      WHEN EXISTS (
        SELECT 1 FROM "LeadAcademicResults" lar
        WHERE lar.lead_id = :leadId
          AND lar.degree_id = course."minSysDegreeId"
          AND (course."minGpa" IS NULL OR CAST(lar.gpa AS DECIMAL) >= CAST(course."minGpa" AS DECIMAL))
      ) THEN 1

      WHEN course."higherSysDegreeId" IS NOT NULL AND EXISTS (
        SELECT 1 FROM "LeadAcademicResults" lar2
        WHERE lar2.lead_id = :leadId
          AND lar2.degree_id = course."higherSysDegreeId"
          AND (course."higherGpa" IS NULL OR CAST(lar2.gpa AS DECIMAL) >= CAST(course."higherGpa" AS DECIMAL))
      ) THEN 1

      ELSE 0
    END)`;
  }

  private buildEnglishEligibilityExpr(): string {
    return `(CASE
      WHEN NOT EXISTS (
        SELECT 1 FROM "CourseEngReq" cer
        WHERE cer."uniCourseId" = course.id
      ) THEN 1

      WHEN EXISTS (
        SELECT 1
        FROM "CourseEngReq" cer
        INNER JOIN "LeadEnglishTestResults" letr
          ON letr."leadId" = :leadId
         AND letr."sysEngTestId" = cer."sysEngTestId"
         AND CAST(letr."overallScore" AS DECIMAL) >= CAST(COALESCE(cer."minOverallReq", 0) AS DECIMAL)

        WHERE cer."uniCourseId" = course.id
          AND (
            cer."minSectionReq" IS NULL
            OR NOT EXISTS (
              SELECT 1 FROM "LeadEnglishTestSectionResults" sec2
              WHERE sec2."resultId" = letr.id
                AND CAST(sec2."sectionScore" AS DECIMAL) < CAST(cer."minSectionReq" AS DECIMAL)
            )
          )
      ) THEN 1

      ELSE 0
    END)`;
  }

  // =========================================================================
  // HYDRATION (separate from ranking — loads full relations)
  // =========================================================================

  private async hydrateByIds(
    candidateIds: string[],
  ): Promise<UniCourseIntakes[]> {
    if (candidateIds.length === 0) return [];

    return this.dataSource
      .createQueryBuilder(UniCourseIntakes, 'ci')
      .innerJoinAndSelect('ci.UniCourse', 'course')
      .innerJoinAndSelect('course.SysUniversity', 'uni')
      .innerJoinAndSelect('uni.SysCountry', 'country')
      .leftJoinAndSelect('uni.SysState', 'state')
      .leftJoinAndSelect('uni.SysCity', 'city')

      .innerJoinAndSelect('ci.UniIntake', 'uniIntake')
      .innerJoinAndSelect('uniIntake.SysIntake', 'sysIntake')

      .leftJoinAndSelect(
        'ci.CourseIntakeScholarship',
        'scholarships',
        'scholarships.isActive = true',
      )

      .leftJoinAndSelect('course.CourseEngReq', 'engReqs')
      .leftJoinAndSelect('engReqs.SysEnglishTest', 'engTest')

      .leftJoinAndSelect('course.minSysAcademicDegree', 'minDegree')
      .leftJoinAndSelect('course.higherSysAcademicDegree', 'higherDegree')

      .where('ci.id IN (:...candidateIds)', { candidateIds })
      .getMany();
  }

  private async hydrateByIdsPreservingOrder(
    orderedIds: string[],
  ): Promise<UniCourseIntakes[]> {
    const hydrated = await this.hydrateByIds(orderedIds);
    const byId = new Map(hydrated.map((c) => [c.id, c]));

    return orderedIds
      .map((id) => byId.get(id))
      .filter((c): c is UniCourseIntakes => c !== undefined);
  }

  // =========================================================================
  // NEXT INTAKE: horizon window (WHERE only)
  // =========================================================================

  /**
   * Restricts to intakes within the future horizon using index-friendly
   * year/month range logic (avoids computed expression in WHERE).
   *
   * Only adds WHERE clauses — no DISTINCT ON or ORDER BY.
   * DISTINCT ON is applied by each ranking path's inner layer.
   */
  private applyNextIntakeWindow(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    intakeWindow: IntakeWindow,
  ): SelectQueryBuilder<UniCourseIntakes> {
    const intakeMonthExpr = INTAKE_MONTH_EXPR;

    // Lower bound: (year > minYear) OR (year = minYear AND month >= minMonth)
    qb.andWhere(
      new Brackets((sub) => {
        sub
          .where('ci.intakeYear > :minYear', {
            minYear: intakeWindow.minYear,
          })
          .orWhere(
            new Brackets((inner) => {
              inner
                .where('ci.intakeYear = :minYear')
                .andWhere(`${intakeMonthExpr} >= :minMonth`, {
                  minMonth: intakeWindow.minMonth,
                });
            }),
          );
      }),
    );

    // Upper bound: (year < maxYear) OR (year = maxYear AND month <= maxMonth)
    qb.andWhere(
      new Brackets((sub) => {
        sub
          .where('ci.intakeYear < :maxYear', {
            maxYear: intakeWindow.maxYear,
          })
          .orWhere(
            new Brackets((inner) => {
              inner
                .where('ci.intakeYear = :maxYear')
                .andWhere(`${intakeMonthExpr} <= :maxMonth`, {
                  maxMonth: intakeWindow.maxMonth,
                });
            }),
          );
      }),
    );

    return qb;
  }

  // =========================================================================
  // FILTERS (split for readability — no logic change)
  // =========================================================================

  private applySearchTextFilter(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    if (!params.searchText?.trim()) return qb;

    const pattern = `%${params.searchText.trim()}%`;

    qb.innerJoin('course.SysProgramme', 'programme');
    qb.andWhere(
      new Brackets((sub) => {
        sub
          .where('course.courseName ILIKE :pattern', { pattern })
          .orWhere('uni.uniName ILIKE :pattern', { pattern })
          .orWhere('country.countryName ILIKE :pattern', { pattern })
          .orWhere('programme.name ILIKE :pattern', { pattern });
      }),
    );

    return qb;
  }

  private applyLocationFilters(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    const f = params.filters;

    if (f?.countryIds?.length) {
      qb.andWhere('uni.sysCountryId IN (:...countryIds)', {
        countryIds: f.countryIds,
      });
    }

    if (f?.cityIds?.length) {
      qb.andWhere('uni.sysCityId IN (:...cityIds)', {
        cityIds: f.cityIds,
      });
    }

    return qb;
  }

  private applyProgrammeFilter(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    const f = params.filters;

    if (f?.programmeIds?.length) {
      qb.andWhere('course.sysProgrammeId IN (:...programmeIds)', {
        programmeIds: f.programmeIds,
      });
    }

    return qb;
  }

  private applyIntakeFilters(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    const f = params.filters;

    if (f?.intakeIds?.length) {
      qb.andWhere('sysIntake.id IN (:...intakeIds)', {
        intakeIds: f.intakeIds,
      });
    }

    if (f?.intakeYear !== undefined) {
      qb.andWhere('ci.intakeYear = :intakeYear', {
        intakeYear: f.intakeYear,
      });
    }

    return qb;
  }

  private applyScholarshipFlag(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    if (params.flags?.hasScholarship !== true) return qb;

    qb.andWhere(
      `EXISTS (
        SELECT 1 FROM "CourseIntakeScholarships" sch
        WHERE sch."courseIntakeId" = ci.id
          AND sch."isActive" = true
      )`,
    );

    return qb;
  }
}
