import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { CitiesResponseDto } from '@shared/dtos/categories/CitiesResponseDto';

/**
 * Categories Service
 *
 * Handles category-related business logic:
 * - Get cities by country/state
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly db: AppDbContext) {}

  /**
   * Get cities by state
   *
   * @param stateId - State ID (UUID)
   * @returns List of cities in the state
   */
  async getCitiesByState(stateId: string): Promise<CitiesResponseDto> {
    const cities = await this.db.cities.find({
      select: ['id', 'cityName'],
      where: {
        sysStateId: stateId,
        deletedAt: IsNull(),
      },
      order: { cityName: 'ASC' },
    });

    return {
      cities: cities.map((c) => ({ id: c.id, name: c.cityName })),
    };
  }
}
