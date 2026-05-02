import { Test } from '@nestjs/testing';
import { SearchCacheInvalidationService } from './SearchCacheInvalidationService';
import { SearchCacheKeyBuilder } from './SearchCacheKeyBuilder';
import { ICacheService as ICacheToken } from '@shared/tokens/injection.tokens';
import type { ICacheService } from '@shared/interfaces/infrastructure';

describe('SearchCacheInvalidationService', () => {
  let service: SearchCacheInvalidationService;
  let cache: jest.Mocked<ICacheService>;

  beforeEach(async () => {
    cache = {
      get: jest.fn(),
      set: jest.fn(),
      getOrSet: jest.fn(),
      remove: jest.fn(),
      exists: jest.fn(),
      clearByPrefix: jest.fn(),
      getMany: jest.fn(),
      setMany: jest.fn(),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SearchCacheInvalidationService,
        { provide: ICacheToken, useValue: cache },
      ],
    }).compile();

    service = moduleRef.get(SearchCacheInvalidationService);
  });

  it('invalidateUserSearchContext removes user context key', async () => {
    await service.invalidateUserSearchContext('user-1');
    expect(cache.remove).toHaveBeenCalledWith(
      SearchCacheKeyBuilder.forUserContext('user-1'),
    );
  });

  it('invalidateAllSearchResults clears search results prefix', async () => {
    await service.invalidateAllSearchResults();
    expect(cache.clearByPrefix).toHaveBeenCalledWith(
      SearchCacheKeyBuilder.getSearchResultsPrefix(),
    );
  });

  it('invalidateAfterAcademicFormChanged calls remove and clearByPrefix', async () => {
    await service.invalidateAfterAcademicFormChanged('user-1');
    expect(cache.remove).toHaveBeenCalled();
    expect(cache.clearByPrefix).toHaveBeenCalled();
  });
});
