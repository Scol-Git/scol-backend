import { Module } from '@nestjs/common';
import { CategoriesController } from './CategoriesController.controller';
import { CategoriesModule as CategoriesBllModule } from '@bll/services/categories/CategoriesModule.module';

/**
 * Categories API Module
 *
 * Provides category-related endpoints (cities, etc.)
 */
@Module({
  imports: [CategoriesBllModule],
  controllers: [CategoriesController],
})
export class CategoriesModule {}
