import { Module } from '@nestjs/common';
import { SearchCacheInvalidationService } from './SearchCacheInvalidationService';

@Module({
  providers: [SearchCacheInvalidationService],
  exports: [SearchCacheInvalidationService],
})
export class SearchCacheSupportModule {}
