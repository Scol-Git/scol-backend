import { Injectable, Inject } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { ICacheService } from '@shared/interfaces/infrastructure';
import { ICacheService as ICacheToken } from '@shared/tokens/injection.tokens';
import { AdvancedFiltersResponseDto } from '@shared/dtos/search/AdvancedFiltersResponseDto';
import { SearchCacheKeyBuilder } from '../cache/SearchCacheKeyBuilder';

@Injectable()
export class SearchFilterOptionsService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(ICacheToken) private readonly cache: ICacheService,
  ) {}

  async getAdvancedFilters(): Promise<AdvancedFiltersResponseDto> {
    const cacheKey = SearchCacheKeyBuilder.forFilterOptions('advanced');
    return this.cache.getOrSet(
      cacheKey,
      async () => {
        const [countries, programmes] = await Promise.all([
          this.db.countries.find({
            select: ['id', 'countryName'],
            where: { deletedAt: IsNull() },
            order: { countryName: 'ASC' },
          }),
          this.db.programmes.find({
            select: ['id', 'name'],
            where: { deletedAt: IsNull() },
            order: { name: 'ASC' },
          }),
        ]);

        return {
          filters: [
            {
              name: 'country',
              values: countries.map((c) => ({
                id: c.id,
                name: c.countryName,
              })),
            },
            {
              name: 'programme',
              values: programmes.map((p) => ({ id: p.id, name: p.name })),
            },
          ],
        };
      },
      SearchCacheKeyBuilder.TTL.FILTER_OPTIONS,
    );
  }
}
