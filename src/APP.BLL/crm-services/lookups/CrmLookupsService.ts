import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { CrmAcademicDegreesResponseDto } from '@shared/dtos/crm/lookups/CrmAcademicDegreesResponseDto';
import type {
  CrmCitiesResponseDto,
  CrmCountriesResponseDto,
  CrmGeoLookupItemDto,
  CrmStatesResponseDto,
} from '@shared/dtos/crm/lookups/CrmGeoLookupResponseDto';
import type { CrmProgrammesResponseDto } from '@shared/dtos/crm/lookups/CrmProgrammesResponseDto';

@Injectable()
export class CrmLookupsService {
  constructor(private readonly db: AppDbContext) {}

  async listAcademicDegrees(): Promise<CrmAcademicDegreesResponseDto> {
    const rows = await this.db.academicDegrees.find({
      where: { deletedAt: IsNull() },
      order: { levelOrder: 'ASC', degreeName: 'ASC' },
    });

    return {
      degrees: rows.map((d) => ({
        id: d.id,
        degreeName: d.degreeName,
        levelOrder: d.levelOrder ?? null,
        gpaScale: d.gpaScale ?? null,
      })),
    };
  }

  async listProgrammes(): Promise<CrmProgrammesResponseDto> {
    const rows = await this.db.programmes.find({
      where: { deletedAt: IsNull() },
      order: { name: 'ASC' },
    });
    return {
      programmes: rows.map((row) => this.toGeoItem(row.id, row.name, row.isPublished)),
    };
  }

  async listCountries(): Promise<CrmCountriesResponseDto> {
    const rows = await this.db.countries.find({
      where: { deletedAt: IsNull() },
      order: { countryName: 'ASC' },
    });
    return {
      countries: rows.map((row) => this.toGeoItem(row.id, row.countryName, row.isPublished)),
    };
  }

  async listStates(countryId: string): Promise<CrmStatesResponseDto> {
    const rows = await this.db.states.find({
      where: { sysCountryId: countryId, deletedAt: IsNull() },
      order: { stateName: 'ASC' },
    });
    return {
      states: rows.map((row) => this.toGeoItem(row.id, row.stateName, row.isPublished)),
    };
  }

  async listCities(stateId: string): Promise<CrmCitiesResponseDto> {
    const rows = await this.db.cities.find({
      where: { sysStateId: stateId, deletedAt: IsNull() },
      order: { cityName: 'ASC' },
    });
    return {
      cities: rows.map((row) => this.toGeoItem(row.id, row.cityName, row.isPublished)),
    };
  }

  private toGeoItem(id: string, name: string, isPublished: boolean): CrmGeoLookupItemDto {
    return { id, name, isPublished };
  }
}
