import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from '@bll/services/categories/CategoriesService';
import { CitiesResponseDto } from '@shared/dtos/categories/CitiesResponseDto';

/**
 * Categories Controller
 *
 * Handles category-related endpoints:
 * - GET /categories/cities - Get cities by state
 */
@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /**
   * Get cities by state
   * GET /categories/cities?stateId=123
   *
   * Returns all cities for a given state.
   */
  @Get('cities')
  @ApiOperation({ summary: 'Get cities by state' })
  @ApiQuery({
    name: 'stateId',
    required: true,
    description: 'State ID (UUID)',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  async getCitiesByState(
    @Query('stateId') stateId: string,
  ): Promise<CitiesResponseDto> {
    return this.categoriesService.getCitiesByState(stateId);
  }
}
