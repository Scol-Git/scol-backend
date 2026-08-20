import { Injectable } from '@nestjs/common';
import { IsNull } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ValidationException } from '@shared/exceptions/ValidationException';
import type { SysUniversities } from '@entity/entities/SysUniversities.entity';
import type { UpdateCrmUniversityRequestDto } from '@shared/dtos/crm/universities/UpdateCrmUniversityRequestDto';

@Injectable()
export class CrmUniversityValidationService {
  constructor(private readonly db: AppDbContext) {}

  async validateUpdate(
    university: SysUniversities,
    dto: UpdateCrmUniversityRequestDto,
  ): Promise<void> {
    this.validateCommissionPairing(university, dto);
    await this.validateGeoConsistency(university, dto);
  }

  private validateCommissionPairing(
    university: SysUniversities,
    dto: UpdateCrmUniversityRequestDto,
  ): void {
    const nextCommission =
      dto.commission !== undefined
        ? dto.commission
        : (university.commission ?? null);
    const nextType =
      dto.commissionType !== undefined
        ? dto.commissionType
        : (university.commissionType ?? null);

    const hasCommission = nextCommission != null && nextCommission !== '';
    const hasType = nextType != null;

    if (hasCommission !== hasType) {
      throw new ValidationException(
        'commission and commissionType must be provided together',
        {
          commission: ['Must be paired with commissionType'],
          commissionType: ['Must be paired with commission'],
        },
      );
    }
  }

  private async validateGeoConsistency(
    university: SysUniversities,
    dto: UpdateCrmUniversityRequestDto,
  ): Promise<void> {
    const countryId =
      dto.sysCountryId !== undefined
        ? dto.sysCountryId
        : university.sysCountryId;
    const stateId =
      dto.sysStateId !== undefined
        ? dto.sysStateId
        : (university.sysStateId ?? null);
    const cityId =
      dto.sysCityId !== undefined
        ? dto.sysCityId
        : (university.sysCityId ?? null);

    if (dto.sysCountryId !== undefined) {
      const country = await this.db.countries.findOne({
        where: { id: dto.sysCountryId, deletedAt: IsNull() },
      });
      if (!country) {
        throw new ValidationException('Country not found', {
          sysCountryId: ['Invalid country id'],
        });
      }
    }

    if (stateId != null) {
      const state = await this.db.states.findOne({
        where: { id: stateId, deletedAt: IsNull() },
      });
      if (!state) {
        throw new ValidationException('State not found', {
          sysStateId: ['Invalid state id'],
        });
      }
      if (state.sysCountryId !== countryId) {
        throw new ValidationException(
          'State does not belong to the selected country',
          { sysStateId: ['State is not in the selected country'] },
        );
      }
    }

    if (cityId != null) {
      const city = await this.db.cities.findOne({
        where: { id: cityId, deletedAt: IsNull() },
      });
      if (!city) {
        throw new ValidationException('City not found', {
          sysCityId: ['Invalid city id'],
        });
      }
      if (stateId == null) {
        throw new ValidationException(
          'sysStateId is required when sysCityId is set',
          { sysStateId: ['Required when city is provided'] },
        );
      }
      if (city.sysStateId !== stateId) {
        throw new ValidationException(
          'City does not belong to the selected state',
          { sysCityId: ['City is not in the selected state'] },
        );
      }
    }
  }
}
