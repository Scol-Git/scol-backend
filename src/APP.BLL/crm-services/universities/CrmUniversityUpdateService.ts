import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { SysCities } from '@entity/entities/SysCities.entity';
import type { SysCountries } from '@entity/entities/SysCountries.entity';
import type { SysStates } from '@entity/entities/SysStates.entity';
import { applyDefinedFields } from '@shared/utils/PartialUpdateUtil';
import {
  UNIVERSITY_UPDATABLE_FIELDS,
  type UpdateCrmUniversityRequestDto,
} from '@shared/dtos/crm/universities/UpdateCrmUniversityRequestDto';
import type { UpdateCrmUniversityResponseDto } from '@shared/dtos/crm/universities/UpdateCrmUniversityResponseDto';
import { CrmUniversityLookupService } from './helpers/CrmUniversityLookupService';
import { CrmUniversityValidationService } from './helpers/CrmUniversityValidationService';

@Injectable()
export class CrmUniversityUpdateService {
  constructor(
    private readonly db: AppDbContext,
    private readonly lookupService: CrmUniversityLookupService,
    private readonly validationService: CrmUniversityValidationService,
  ) {}

  async updateUniversity(
    uniId: string,
    dto: UpdateCrmUniversityRequestDto,
  ): Promise<UpdateCrmUniversityResponseDto> {
    const university = await this.lookupService.loadUniversityOrThrow(uniId);
    await this.validationService.validateUpdate(university, dto);

    const changed = applyDefinedFields(
      university,
      dto,
      UNIVERSITY_UPDATABLE_FIELDS,
    );

    // Loaded relations win over the foreign-key columns on save.
    if (dto.sysCountryId) {
      university.SysCountry = { id: dto.sysCountryId } as SysCountries;
    }
    if (dto.sysStateId !== undefined) {
      university.SysState = (dto.sysStateId ? { id: dto.sysStateId } : null) as SysStates;
    }
    if (dto.sysCityId !== undefined) {
      university.SysCity = (dto.sysCityId ? { id: dto.sysCityId } : null) as SysCities;
    }

    if (changed) {
      await this.db.universities.save(university);
    }

    return {
      success: true,
      message: 'University updated successfully',
    };
  }
}
