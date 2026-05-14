import { Injectable, Inject } from '@nestjs/common';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import { ICacheService as ICacheToken } from '@shared/tokens/injection.tokens';
import { SearchCacheKeyBuilder } from './SearchCacheKeyBuilder';

/**
 * Centralizes search cache invalidation so callers do not depend on key shapes.
 * Depends only on ICacheService and SearchCacheKeyBuilder (no SearchModule / LeadsModule).
 */
@Injectable()
export class SearchCacheInvalidationService {
  constructor(@Inject(ICacheToken) private readonly cache: ICacheService) {}

  async invalidateUserSearchContext(userId: string): Promise<void> {
    await this.cache.remove(SearchCacheKeyBuilder.forUserContext(userId));
  }

  async invalidateAllSearchResults(): Promise<void> {
    await this.cache.clearByPrefix(
      SearchCacheKeyBuilder.getSearchResultsPrefix(),
    );
  }

  async invalidateAfterAcademicFormChanged(userId: string): Promise<void> {
    await this.invalidateUserSearchContext(userId);
  }
}
