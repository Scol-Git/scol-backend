import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from '@bll/services/categories/CategoriesService';
import { CitiesResponseDto } from '@shared/dtos/categories/CitiesResponseDto';

/**
 * Categories Controller
 *
 * Handles category-related endpoints:
 * - GET /categories/cities - Get cities by country
 */
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Get cities by country
   * GET /categories/cities?countryId=123
   *
   * Returns all cities for a given country.
   */
  @Get('cities')
  @ApiOperation({ summary: 'Get cities by country' })
  @ApiQuery({
    name: 'countryId',
    required: true,
    description: 'Country ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getCitiesByCountry(
    @Query('countryId') countryId: string,
  ): Promise<CitiesResponseDto> {
    return await this.categoriesService.getCitiesByCountry(countryId);
  }
}
