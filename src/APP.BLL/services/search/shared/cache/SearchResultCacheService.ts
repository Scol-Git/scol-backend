import { Injectable, Inject } from '@nestjs/common';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import { ICacheService as ICacheToken } from '@shared/tokens/injection.tokens';
import {
  SearchCacheKeyBuilder,
  SearchResultsKeyParams,
} from './SearchCacheKeyBuilder';
import {
  SearchExecutionSource,
  type PipelineParams,
} from '../pipeline/SearchPipelineTypes';
import { PublishStatus } from '@shared/enums/crm/PublishStatus.enum';

@Injectable()
export class SearchResultCacheService {
  constructor(@Inject(ICacheToken) private readonly cache: ICacheService) {}

  getOrSet<T>(params: PipelineParams, factory: () => Promise<T>): Promise<T> {
    // CRM draft / all views are never cached (publish params are not part of the key).
    if (
      params.source === SearchExecutionSource.CRM &&
      (params.publishStatus ?? PublishStatus.PUBLISHED) !== PublishStatus.PUBLISHED
    ) {
      return factory();
    }
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
      factory,
      SearchCacheKeyBuilder.TTL.SEARCH_RESULTS,
    );
  }
}
