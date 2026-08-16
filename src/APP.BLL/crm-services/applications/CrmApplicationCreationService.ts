import { Injectable } from '@nestjs/common';
import { ApplicationCreationService } from '@bll/services/applications/ApplicationCreationService';
import { CreateApplicationRequestDto } from '@shared/dtos/applications/CreateApplicationRequestDto';
import { CreateApplicationResponseDto } from '@shared/dtos/applications/CreateApplicationResponseDto';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';

@Injectable()
export class CrmApplicationCreationService {
  constructor(
    private readonly accessService: CrmApplicationAccessService,
    private readonly applicationCreationService: ApplicationCreationService,
  ) {}

  async createApplicationForLead(
    currentUserId: string,
    leadId: string,
    dto: CreateApplicationRequestDto,
  ): Promise<CreateApplicationResponseDto> {
    // await this.accessService.ensureCrmCanAccessLeadOrThrow(
    //   currentUserId,
    //   leadId,
    // );

    return this.applicationCreationService.createApplicationForAuthorizedLead(
      leadId,
      dto,
      currentUserId,
    );
  }
}
