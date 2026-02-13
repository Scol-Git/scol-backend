import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { CitiesResponseDto } from '@shared/dtos/categories/CitiesResponseDto';

/**
 * Categories Service
 *
 * Handles category-related business logic:
 * - Get cities by country
 */
@Injectable()
export class CategoriesService {
  constructor(private readonly db: AppDbContext) {}

  /**
   * Get cities by country
   *
   * @param countryId - Country ID (UUID)
   * @returns List of cities in the country
   */
  async getCitiesByCountry(countryId: string): Promise<CitiesResponseDto> {
    const cities = await this.db.cities
      .createQueryBuilder('city')
      .innerJoin('city.SysState', 'state')
      .where('state.sysCountryId = :countryId', { countryId })
      .andWhere('city.deletedAt IS NULL')
      .select(['city.id', 'city.cityName'])
      .orderBy('city.cityName', 'ASC')
      .getMany();

    return {
      cities: cities.map((c) => ({ id: c.id, name: c.cityName })),
    };
  }
}
