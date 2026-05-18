import { Injectable, Inject } from '@nestjs/common';

import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';

import { RankingMode } from '@shared/enums/RankingMode.enum';

import { SearchResponseDto } from '@shared/dtos/search/SearchResponseDto';

import { RankedCourse } from '@shared/search/SearchTypes';

import { CourseCursorPaginationService } from '../CourseCursorPaginationService';
import { CourseResponseMapper } from '../../../../mappings/search/CourseResponseMapper';

import { SearchResultCacheService } from '../cache/SearchResultCacheService';
import { SearchBaseQueryBuilder } from './query/SearchBaseQueryBuilder';
import { BusinessOnlyCandidateQuery } from './query/BusinessOnlyCandidateQuery';
import { PersonalizedCandidateQuery } from './query/PersonalizedCandidateQuery';
import { CourseSearchHydrator } from './hydration/CourseSearchHydrator';

import {
  SearchExecutionSource,
  type PipelineParams,
} from './SearchPipelineTypes';

export type { PipelineParams } from './SearchPipelineTypes';

@Injectable()
export class SearchPipelineExecutor {
  constructor(
    private readonly paginationService: CourseCursorPaginationService,
    private readonly responseMapper: CourseResponseMapper,
    private readonly searchResultCache: SearchResultCacheService,
    private readonly baseQueryBuilder: SearchBaseQueryBuilder,
    private readonly businessOnlyCandidateQuery: BusinessOnlyCandidateQuery,
    private readonly personalizedCandidateQuery: PersonalizedCandidateQuery,
    private readonly courseSearchHydrator: CourseSearchHydrator,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  async execute(params: PipelineParams): Promise<SearchResponseDto> {
    const startTime = Date.now();

    return this.searchResultCache.getOrSet(params, async () => {
      const useDbRanking = this.canUseDbRanking(params);
      const intakeWindow = this.baseQueryBuilder.computeIntakeWindow();

      const candidates = useDbRanking
        ? await this.businessOnlyCandidateQuery.getCandidates(
            params,
            intakeWindow,
          )
        : await this.personalizedCandidateQuery.getCandidates(
            params,
            intakeWindow,
          );

      if (candidates.length === 0) {
        return this.responseMapper.toEmptyResponse(
          params.context,
          params.listType,
        );
      }

      const orderedIds = candidates.map((c) => c.courseIntakeId);
      const hydrated =
        await this.courseSearchHydrator.hydrateSummaryPage(orderedIds);
      const rowMap = new Map(candidates.map((c) => [c.courseIntakeId, c]));

      const rankedCourses: RankedCourse[] = hydrated.map((courseIntake) => {
        const row = rowMap.get(courseIntake.id)!;
        return {
          courseIntake,
          rankScore: row.rankScore,
          isEligible: row.isEligible,
        };
      });

      const result = this.buildResponseFromCandidates(
        params,
        rankedCourses,
        useDbRanking ? 'DB_RANKING' : 'DB_DRIVEN_RANKING',
      );

      this.logger.LogDebug('Pipeline execution complete', {
        context: 'SearchPipelineExecutor.execute',
        executionPath: useDbRanking ? 'DB_RANKING' : 'DB_DRIVEN_RANKING',
        elapsedMs: Date.now() - startTime,
        resultCount: result.courses.length,
        hasNext: result.pagination.hasNext,
        listType: params.listType,
      });

      return result;
    });
  }

  private canUseDbRanking(params: PipelineParams): boolean {
    return (
      params.context.rankingMode === RankingMode.BUSINESS_ONLY ||
      !params.context.normalizedProfile?.leadId
    );
  }

  private buildResponseFromCandidates(
    params: PipelineParams,
    rankedCourses: RankedCourse[],
    executionPath: 'DB_RANKING' | 'DB_DRIVEN_RANKING',
  ): SearchResponseDto {
    const paginated = this.paginationService.buildPaginatedResult(
      rankedCourses,
      params.limit,
    );

    this.logger.LogDebug('Pipeline result page', {
      context: 'SearchPipelineExecutor.buildResponseFromCandidates',
      executionPath,
      resultCount: paginated.items.length,
      hasNext: paginated.hasNext,
    });

    return this.responseMapper.toSearchResponse(
      params.context,
      paginated,
      params.listType,
    );
  }
}
