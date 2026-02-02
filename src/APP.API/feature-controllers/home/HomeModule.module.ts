import { Module } from '@nestjs/common';
import { HomeController } from './HomeController.controller';
import { SearchModule } from '@bll/services/search/SearchModule.module';

/**
 * Home API Module
 *
 * Provides home page endpoint.
 * Imports SearchModule from BLL for search services.
 */
@Module({
  imports: [SearchModule],
  controllers: [HomeController],
})
export class HomeModule {}
