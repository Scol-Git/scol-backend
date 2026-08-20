import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
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

    if (changed) {
      await this.db.universities.save(university);
    }

    return {
      success: true,
      message: 'University updated successfully',
    };
  }
}
