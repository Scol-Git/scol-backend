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
 * Candidate with commission score (DB ranking)
 */
interface CandidateWithScore {
  id: string;
  commissionScore: number;
}

/**
 * Row from DB-driven eligibility ranking (logged-in)
 */
interface RankedCandidateRow {
  courseIntakeId: string;
  rankScore: number;
  isEligible: boolean;
}

/** Preference weights */
const COUNTRY_PREFERENCE_WEIGHT = 1500;
const PROGRAMME_PREFERENCE_WEIGHT = 1500;

@Injectable()
export class SearchPipelineExecutor {
  /** Commission constants */
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

        const result = useDbRanking
          ? await this.executeWithDbRanking(params)
          : await this.executeWithDbDrivenRanking(params);

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

  // =========================================================================
  // SHARED HELPERS
  // =========================================================================

  private getSqlPagination(params: PipelineParams): {
    effectiveLimit: number;
    limitPlusOne: number;
  } {
    const effectiveLimit = this.paginationService.getEffectiveLimit(
      params.limit,
    );
    return {
      effectiveLimit,
      limitPlusOne: effectiveLimit + 1,
    };
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
  // PATH 1: DB COMMISSION RANKING (BUSINESS_ONLY or missing leadId)
  // =========================================================================

  private async executeWithDbRanking(
    params: PipelineParams,
  ): Promise<SearchResponseDto> {
    // BUSINESS_ONLY has no "ineligible" concept
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
    cursorRank: number | null,
    cursorCourseIntakeId: string | null,
    limitPlusOne: number,
  ): Promise<CandidateWithScore[]> {
    const commissionExpr = this.buildCommissionExpr();

    let qb = this.dataSource
      .createQueryBuilder(UniCourseIntakes, 'ci')
      .select('ci.id', 'id')
      .addSelect(commissionExpr, 'commissionScore')
      .innerJoin('ci.UniCourse', 'course')
      .innerJoin('course.SysUniversity', 'uni')
      .innerJoin('uni.SysCountry', 'country')
      .innerJoin('ci.UniIntake', 'uniIntake')
      .innerJoin('uniIntake.SysIntake', 'sysIntake')
      .where('ci.isActive = true');

    qb = this.applyFilters(qb, params);

    const applyNextIntake = this.shouldApplyNextIntakeRule(params);
    if (applyNextIntake) {
      qb = this.applyNextIntakeWindow(qb, params);
    }

    let sql = qb.getQuery();
    const sqlParams = qb.getParameters();

    if (applyNextIntake) {
      sql = this.wrapWithRnFilter(sql, 'sub.id, sub."commissionScore"');
    }

    let outer = this.dataSource
      .createQueryBuilder()
      .select('sub.id', 'id')
      .addSelect('sub."commissionScore"', 'commissionScore')
      .from(`(${sql})`, 'sub')
      .setParameters(sqlParams);

    if (cursorRank !== null && cursorCourseIntakeId !== null) {
      outer = outer.andWhere(
        '(sub."commissionScore", sub.id) < (:cursorRank, :cursorCourseIntakeId)',
        {
          cursorRank: Math.floor(cursorRank),
          cursorCourseIntakeId,
        },
      );
    }

    outer = outer
      .orderBy('sub."commissionScore"', 'DESC')
      .addOrderBy('sub.id', 'ASC')
      .limit(limitPlusOne);

    const results = await outer.getRawMany<{
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
  ): Promise<SearchResponseDto> {
    const { limitPlusOne } = this.getSqlPagination(params);
    const { cursorRank, cursorCourseIntakeId } = this.getCursor(params);

    const rows = await this.getRankedCandidatesDbDriven(
      params,
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

    const academicExpr = this.buildAcademicEligibilityExpr();
    const englishExpr = this.buildEnglishEligibilityExpr();
    const preferenceExpr = this.buildPreferenceExpr();
    const commissionExpr = this.buildCommissionExpr();

    // ---------------------------
    // Layer 1: Eligibility + Raw Scores
    // ---------------------------
    let eligibilityQb = this.dataSource
      .createQueryBuilder(UniCourseIntakes, 'ci')
      .select('ci.id', 'courseIntakeId')
      .addSelect(academicExpr, 'academicEligible')
      .addSelect(englishExpr, 'englishEligible')
      .addSelect(preferenceExpr, 'preferenceScore')
      .addSelect(commissionExpr, 'commissionScore')
      .innerJoin('ci.UniCourse', 'course')
      .innerJoin('course.SysUniversity', 'uni')
      .innerJoin('uni.SysCountry', 'country')
      .innerJoin('ci.UniIntake', 'uniIntake')
      .innerJoin('uniIntake.SysIntake', 'sysIntake')
      .where('ci.isActive = true')
      .setParameter('leadId', leadId);

    eligibilityQb = this.applyFilters(eligibilityQb, params);

    const applyNextIntake = this.shouldApplyNextIntakeRule(params);
    if (applyNextIntake) {
      eligibilityQb = this.applyNextIntakeWindow(eligibilityQb, params);
    }

    let eligibilitySql = eligibilityQb.getQuery();
    const eligibilityParams = eligibilityQb.getParameters();

    if (applyNextIntake) {
      eligibilitySql = this.wrapWithRnFilter(
        eligibilitySql,
        'sub."courseIntakeId", sub."academicEligible", sub."englishEligible", sub."preferenceScore", sub."commissionScore"',
      );
    }

    // ---------------------------
    // Layer 2: Final RankScore + Eligible Flag
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
      .from(`(${eligibilitySql})`, 's1')
      .setParameters(eligibilityParams);

    const scoringSql = scoringQb.getQuery();
    const scoringParams = scoringQb.getParameters();

    // ---------------------------
    // Layer 3: Paging + Cursor
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

  private buildPreferenceExpr(): string {
    return `(
      (CASE WHEN EXISTS (
        SELECT 1 FROM "LeadPreferredCountries" lpc
        WHERE lpc.lead_id = :leadId
          AND lpc.country_id = uni."sysCountryId"
      ) THEN ${COUNTRY_PREFERENCE_WEIGHT} ELSE 0 END)

      +

      (CASE WHEN EXISTS (
        SELECT 1 FROM "LeadPreferredPrograms" lpp
        WHERE lpp.lead_id = :leadId
          AND lpp.programme_id = course."sysProgrammeId"
      ) THEN ${PROGRAMME_PREFERENCE_WEIGHT} ELSE 0 END)
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
  // HYDRATION
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
  // NEXT INTAKE DEDUPLICATION
  // =========================================================================

  /** Quoted alias so PostgreSQL matches TypeORM-generated "sysIntake" (case-sensitive). */
  private static readonly INTAKE_MONTH_COL = '"sysIntake"."intakeMonth"';

  private shouldApplyNextIntakeRule(params: PipelineParams): boolean {
    const f = params.filters;
    return !f?.intakeIds?.length && f?.intakeYear === undefined;
  }

  private applyNextIntakeWindow(
    qb: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    void params;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const intakeMonthExpr = `COALESCE(${SearchPipelineExecutor.INTAKE_MONTH_COL}, 1)`;

    const isFutureExpr = `
      (ci.intakeYear > :currentYear
       OR (ci.intakeYear = :currentYear AND ${intakeMonthExpr} >= :currentMonth))
    `;

    const intakeKey = `(COALESCE(ci.intakeYear, 0) * 12 + ${intakeMonthExpr})`;

    qb.setParameter('currentYear', currentYear);
    qb.setParameter('currentMonth', currentMonth);

    qb.addSelect(
      `ROW_NUMBER() OVER (
        PARTITION BY course.id
        ORDER BY
          (${isFutureExpr}) DESC,
          CASE WHEN (${isFutureExpr}) THEN ${intakeKey} END ASC,
          CASE WHEN NOT (${isFutureExpr}) THEN ${intakeKey} END DESC
      )`,
      'rn',
    );

    return qb;
  }

  private wrapWithRnFilter(innerSql: string, selectList: string): string {
    return `SELECT ${selectList} FROM (${innerSql}) sub WHERE sub.rn = 1`;
  }

  // =========================================================================
  // FILTERS
  // =========================================================================

  private applyFilters(
    query: SelectQueryBuilder<UniCourseIntakes>,
    params: PipelineParams,
  ): SelectQueryBuilder<UniCourseIntakes> {
    if (params.searchText?.trim()) {
      const pattern = `%${params.searchText.trim()}%`;

      query.andWhere(
        new Brackets((qb) => {
          qb.where('course.courseName ILIKE :pattern', { pattern })
            .orWhere('uni.uniName ILIKE :pattern', { pattern })
            .orWhere('country.countryName ILIKE :pattern', { pattern });
        }),
      );
    }

    const f = params.filters;

    if (f?.countryIds?.length) {
      query.andWhere('uni.sysCountryId IN (:...countryIds)', {
        countryIds: f.countryIds,
      });
    }

    if (f?.cityIds?.length) {
      query.andWhere('uni.sysCityId IN (:...cityIds)', {
        cityIds: f.cityIds,
      });
    }

    if (f?.programmeIds?.length) {
      query.andWhere('course.sysProgrammeId IN (:...programmeIds)', {
        programmeIds: f.programmeIds,
      });
    }

    if (f?.intakeIds?.length) {
      query.andWhere('sysIntake.id IN (:...intakeIds)', {
        intakeIds: f.intakeIds,
      });
    }

    if (f?.intakeYear !== undefined) {
      query.andWhere('ci.intakeYear = :intakeYear', {
        intakeYear: f.intakeYear,
      });
    }

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
