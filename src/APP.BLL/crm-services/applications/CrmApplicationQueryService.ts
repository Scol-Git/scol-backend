import { Injectable } from '@nestjs/common';
import { ApplicationQueryService } from '@bll/services/applications/ApplicationQueryService';
import { GetApplicationDetailsResponseDto } from '@shared/dtos/applications/GetApplicationDetailsResponseDto';
import { GetApplicationDocumentProgressResponseDto } from '@shared/dtos/applications/GetApplicationDocumentProgressResponseDto';
import { GetApplicationStageProgressResponseDto } from '@shared/dtos/applications/GetApplicationStageProgressResponseDto';
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
      'CRM',
    );
  }

  async getApplicationDetails(
    currentUserId: string,
    leadId: string,
    applicationId: string,
  ): Promise<GetApplicationDetailsResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.applicationQueryService.getApplicationDetailsForAuthorizedApplication(
      application.id,
      'CRM',
    );
  }

  async getApplicationStageProgress(
    currentUserId: string,
    leadId: string,
    applicationId: string,
  ): Promise<GetApplicationStageProgressResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.applicationQueryService.getApplicationStageProgressForAuthorizedApplication(
      application.id,
      'CRM',
    );
  }

  async getApplicationDocumentProgress(
    currentUserId: string,
    leadId: string,
    applicationId: string,
  ): Promise<GetApplicationDocumentProgressResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.applicationQueryService.getApplicationDocumentProgressForAuthorizedApplication(
      application.id,
      'CRM',
    );
  }
}
