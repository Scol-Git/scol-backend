import { Module } from '@nestjs/common';
import { CategoriesService } from './CategoriesService';

/**
 * Categories BLL Module
 *
 * Provides category-related business logic services
 */
@Module({
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
