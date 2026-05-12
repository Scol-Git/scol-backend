import { Injectable, Inject } from '@nestjs/common';
import { Brackets, DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { ListType } from '@shared/enums/ListType.enum';
import { RankingMode } from '@shared/enums/RankingMode.enum';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { CourseCursorPaginationService } from '../../CourseCursorPaginationService';
import { SearchBaseQueryBuilder } from './SearchBaseQueryBuilder';
import { SearchRankingSqlBuilder } from './SearchRankingSqlBuilder';
import type { PipelineParams } from '../SearchPipelineTypes';
import type { IntakeWindow } from '../SearchPipelineTypes';
import type { SearchCandidate } from '../SearchPipelineTypes';
import type { CursorData } from '@shared/search/SearchTypes';

@Injectable()
export class BusinessOnlyCandidateQuery {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly baseQueryBuilder: SearchBaseQueryBuilder,
    private readonly rankingSqlBuilder: SearchRankingSqlBuilder,
    private readonly paginationService: CourseCursorPaginationService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async getCandidates(
    params: PipelineParams,
    intakeWindow: IntakeWindow,
  ): Promise<SearchCandidate[]> {
    if (
      params.listType === ListType.INELIGIBLE_ONLY &&
      params.context.rankingMode === RankingMode.BUSINESS_ONLY
    ) {
      return [];
    }

    const effectiveLimit = this.paginationService.getEffectiveLimit(
      params.limit,
    );
    const limitPlusOne = effectiveLimit + 1;

    const cursorData: CursorData | null = params.cursor
      ? this.paginationService.decodeCursor(params.cursor)
      : null;
    const cursorRank = cursorData?.rankScore ?? null;
    const cursorCourseIntakeId = cursorData?.courseIntakeId ?? null;

    const commissionExpr = this.rankingSqlBuilder.commissionScoreExpr();
    const needsDedup = this.baseQueryBuilder.shouldApplyNextIntakeRule(params);

    const innerQb = this.baseQueryBuilder.buildBaseQuery(params, intakeWindow);
    innerQb.select('ci.id', 'id').addSelect(commissionExpr, 'commissionScore');

    if (needsDedup) {
      innerQb
        .distinctOn(['course.id'])
        .orderBy('course.id', 'ASC')
        .addOrderBy('ci.intakeKey', 'ASC');
    }

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
        new Brackets((qb) => {
          qb.where('sub."commissionScore" < :cursorRank', {
            cursorRank: Math.floor(cursorRank),
          }).orWhere(
            'sub."commissionScore" = :cursorRank AND sub.id > :cursorCourseIntakeId',
            { cursorRank: Math.floor(cursorRank), cursorCourseIntakeId },
          );
        }),
      );
    }

    rankQb = rankQb
      .orderBy('sub."commissionScore"', 'DESC')
      .addOrderBy('sub.id', 'ASC')
      .limit(limitPlusOne);

    this.logCandidateSqlIfDebug(
      'Candidate SQL for DB_RANKING',
      rankQb,
      'BusinessOnlyCandidateQuery.getCandidates',
    );

    const results = await rankQb.getRawMany<{
      id: string;
      commissionScore: string;
    }>();

    return results.map((r) => ({
      courseIntakeId: r.id,
      rankScore: parseInt(r.commissionScore, 10) || 0,
      isEligible: true,
    }));
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
