import { Module } from '@nestjs/common';
import { SearchCacheSupportModule } from '@bll/services/search/shared/cache/SearchCacheSupportModule.module';
import { PublishService } from './PublishService';
import { PublishRepository } from './PublishRepository';
import { PublishReadinessChecker } from './PublishReadinessChecker';

@Module({
  imports: [SearchCacheSupportModule],
  providers: [PublishService, PublishRepository, PublishReadinessChecker],
  exports: [PublishService, PublishReadinessChecker],
})
export class CrmPublishingModule {}
