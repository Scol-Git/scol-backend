import { Injectable } from '@nestjs/common';
import { ApplicationQueryService } from '@bll/services/applications/ApplicationQueryService';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';

@Injectable()
export class CrmApplicationQueryService {
  constructor(
    private readonly accessService: CrmApplicationAccessService,
    private readonly applicationQueryService: ApplicationQueryService,
  ) {}

  async getApplicationsForLead(
    currentUserId: string,
    leadId: string,
  ): Promise<GetApplicationsResponseDto> {
    await this.accessService.ensureCrmCanAccessLeadOrThrow(
      currentUserId,
      leadId,
    );
    return this.applicationQueryService.getApplicationsForAuthorizedLead(
      leadId,
    );
  }
}
