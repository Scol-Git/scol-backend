import { Injectable, Inject } from '@nestjs/common';
import { ILogger } from '@shared/interfaces/logging';
import { ILogger as ILoggerToken } from '@shared/tokens/injection.tokens';
import { ANONYMOUS_SEARCH_CONTEXT } from '@shared/search/SearchTypes';
import { CrmCourseSearchRequestDto } from '@shared/dtos/crm/search/CrmCourseSearchRequestDto';
import { CrmCourseSearchResponseDto } from '@shared/dtos/crm/search/CrmCourseSearchResponseDto';
import { AdvancedFiltersResponseDto } from '@shared/dtos/search/AdvancedFiltersResponseDto';
import { SearchPipelineExecutor } from '@bll/services/search/shared/pipeline/SearchPipelineExecutor';
import { SearchFilterOptionsService } from '@bll/services/search/shared/filters/SearchFilterOptionsService';
import { SearchExecutionSource } from '@bll/services/search/shared/pipeline/SearchPipelineTypes';

/**
 * CRM Course Search Service
 *
 * Staff-facing course search that always uses business-only ranking
 * (commission-based) via the existing search pipeline.
 */
@Injectable()
export class CrmCourseSearchService {
  constructor(
    private readonly pipelineExecutor: SearchPipelineExecutor,
    private readonly filterOptionsService: SearchFilterOptionsService,
    @Inject(ILoggerToken) private readonly logger: ILogger,
  ) {}

  /**
   * Combined CRM search with text, filters, ranges, and flags.
   */
  async search(
    request: CrmCourseSearchRequestDto,
  ): Promise<CrmCourseSearchResponseDto> {
    const started = Date.now();
    this.logger.debug?.('CRM course search started', {
      context: 'CrmCourseSearchService.search',
      hasSearchText: !!request.searchText?.trim(),
      hasFilters: !!request.filters,
      hasRanges: !!request.ranges,
      hasFlags: !!request.flags,
      listType: request.listType,
      hasCursor: !!request.pagination?.cursor,
    });

    const result = await this.pipelineExecutor.execute({
      searchText: request.searchText,
      filters: request.filters,
      ranges: request.ranges,
      flags: request.flags,
      listType: request.listType,
      cursor: request.pagination?.cursor,
      limit: request.pagination?.limit,
      context: ANONYMOUS_SEARCH_CONTEXT,
      source: SearchExecutionSource.CRM,
    });

    this.logger.debug?.('CRM course search completed', {
      context: 'CrmCourseSearchService.search',
      resultCount: result.courses.length,
      hasNext: result.pagination.hasNext,
      elapsedMs: Date.now() - started,
    });

    return {
      pagination: result.pagination,
      courses: result.courses,
    };
  }

  /**
   * Get available filter options for CRM course search.
   */
  async getFilters(): Promise<AdvancedFiltersResponseDto> {
    return this.filterOptionsService.getAdvancedFilters();
  }
}
