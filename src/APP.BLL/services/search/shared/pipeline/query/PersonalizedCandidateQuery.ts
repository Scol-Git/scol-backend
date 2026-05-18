import { Injectable, Inject } from '@nestjs/common';
import { Brackets, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ListType } from '@shared/enums/ListType.enum';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { CourseCursorPaginationService } from '../../CourseCursorPaginationService';
import { SearchBaseQueryBuilder } from './SearchBaseQueryBuilder';
import { SearchRankingSqlBuilder } from './SearchRankingSqlBuilder';
import { SearchEligibilitySqlBuilder } from './SearchEligibilitySqlBuilder';
import type { PipelineParams } from '../SearchPipelineTypes';
import type { IntakeWindow } from '../SearchPipelineTypes';
import type { SearchCandidate } from '../SearchPipelineTypes';
import type { CursorData } from '@shared/search/SearchTypes';

@Injectable()
export class PersonalizedCandidateQuery {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly baseQueryBuilder: SearchBaseQueryBuilder,
    private readonly rankingSqlBuilder: SearchRankingSqlBuilder,
    private readonly eligibilitySqlBuilder: SearchEligibilitySqlBuilder,
    private readonly paginationService: CourseCursorPaginationService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async getCandidates(
    params: PipelineParams,
    intakeWindow: IntakeWindow,
  ): Promise<SearchCandidate[]> {
    const leadId = params.context.normalizedProfile?.leadId;
    if (!leadId) return [];

    const effectiveLimit = this.paginationService.getEffectiveLimit(
      params.limit,
    );
    const limitPlusOne = effectiveLimit + 1;

    const cursorData: CursorData | null = params.cursor
      ? this.paginationService.decodeCursor(params.cursor)
      : null;
    const cursorRank = cursorData?.rankScore ?? null;
    const cursorCourseIntakeId = cursorData?.courseIntakeId ?? null;

    const includeEligibility = params.listType != null;

    const listTypeEligible = includeEligibility
      ? params.listType === ListType.ELIGIBLE_ONLY
        ? true
        : params.listType === ListType.INELIGIBLE_ONLY
          ? false
          : null
      : null;

    const commissionExpr = this.rankingSqlBuilder.commissionScoreExpr();
    const preferenceExpr = this.rankingSqlBuilder.preferenceScoreExpr();
    const rankScoreExpr = this.rankingSqlBuilder.personalizedRankScoreExpr(
      preferenceExpr,
      commissionExpr,
    );

    let eligibleExpr: string | null = null;
    if (includeEligibility) {
      const academicExpr = this.eligibilitySqlBuilder.academicEligibleExpr();
      const englishExpr = this.eligibilitySqlBuilder.englishEligibleExpr();
      eligibleExpr = this.eligibilitySqlBuilder.eligibleExpr(
        academicExpr,
        englishExpr,
      );
    }

    const needsDedup = this.baseQueryBuilder.shouldApplyNextIntakeRule(params);

    const baseQb = this.baseQueryBuilder.buildBaseQuery(params, intakeWindow);

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

    if (includeEligibility) {
      baseQb
        .leftJoin(
          'LeadAcademicResults',
          'larMin',
          'larMin.lead_id = :leadId AND larMin.degree_id = course."minSysDegreeId" AND (course."minGpa" IS NULL OR CAST(larMin.gpa AS DECIMAL) >= CAST(course."minGpa" AS DECIMAL))',
        )
        .leftJoin(
          'LeadAcademicResults',
          'larHigher',
          'larHigher.lead_id = :leadId AND larHigher.degree_id = course."higherSysDegreeId" AND (course."higherGpa" IS NULL OR CAST(larHigher.gpa AS DECIMAL) >= CAST(course."higherGpa" AS DECIMAL))',
        );
    }

    baseQb
      .select('ci.id', 'courseIntakeId')
      .addSelect(rankScoreExpr, 'rankScore')
      .setParameter('leadId', leadId);

    if (includeEligibility && eligibleExpr) {
      baseQb.addSelect(eligibleExpr, 'eligible');
    }

    if (needsDedup) {
      baseQb
        .distinctOn(['course.id'])
        .orderBy('course.id', 'ASC')
        .addOrderBy('ci.intakeKey', 'ASC');
    }

    const baseSql = baseQb.getQuery();
    const baseParams = baseQb.getParameters();

    let pagingQb = this.dataSource
      .createQueryBuilder()
      .select('s1."courseIntakeId"', 'courseIntakeId')
      .addSelect('s1."rankScore"', 'rankScore')
      .from(`(${baseSql})`, 's1')
      .setParameters(baseParams);

    if (includeEligibility) {
      pagingQb = pagingQb.addSelect('s1.eligible', 'eligible');
    }

    if (listTypeEligible !== null) {
      pagingQb = pagingQb.andWhere('s1.eligible = :listTypeEligible', {
        listTypeEligible,
      });
    }

    if (cursorRank !== null && cursorCourseIntakeId !== null) {
      pagingQb = pagingQb.andWhere(
        new Brackets((qb) => {
          qb.where('s1."rankScore" < :cursorRank', {
            cursorRank: Math.floor(cursorRank),
          }).orWhere(
            's1."rankScore" = :cursorRank AND s1."courseIntakeId" > :cursorCourseIntakeId',
            { cursorRank: Math.floor(cursorRank), cursorCourseIntakeId },
          );
        }),
      );
    }

    pagingQb = pagingQb
      .orderBy('s1."rankScore"', 'DESC')
      .addOrderBy('s1."courseIntakeId"', 'ASC')
      .limit(limitPlusOne);

    this.logCandidateSqlIfDebug(
      'Candidate SQL for DB_DRIVEN_RANKING',
      pagingQb,
      'PersonalizedCandidateQuery.getCandidates',
    );

    const rows = await pagingQb.getRawMany<{
      courseIntakeId: string;
      rankScore: string;
      eligible?: unknown;
    }>();

    return rows.map((r) => ({
      courseIntakeId: r.courseIntakeId,
      rankScore: Number(r.rankScore) || 0,
      isEligible:
        includeEligibility && r.eligible !== undefined
          ? this.toBoolean(r.eligible)
          : null,
    }));
  }

  private toBoolean(value: unknown): boolean {
    return value === true || value === 'true' || value === 1 || value === '1';
  }

  private logCandidateSqlIfDebug(
    label: string,
    qb: { getQuery: () => string; getParameters: () => object },
    logContext: string,
  ): void {
    if (process.env.SEARCH_SQL_DEBUG !== 'true') return;
    const sqlFormatted = this.formatSqlForLog(qb.getQuery());
    const paramsJson = JSON.stringify(qb.getParameters(), null, 2);
    this.logger.LogDebug(
      `${label}\n\n${sqlFormatted}\n\nParams:\n${paramsJson}`,
      {
        context: logContext,
      },
    );
  }

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
}
