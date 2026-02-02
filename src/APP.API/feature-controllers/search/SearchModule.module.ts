import { Module } from '@nestjs/common';
import { SearchController } from './SearchController.controller';
import { SearchModule as SearchBllModule } from '@bll/services/search/SearchModule.module';

/**
 * Search API Module
 *
 * Provides search endpoints.
 * Imports SearchModule from BLL for search services.
 */
@Module({
  imports: [SearchBllModule],
  controllers: [SearchController],
})
export class SearchModule {}
