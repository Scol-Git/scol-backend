import { Injectable } from '@nestjs/common';
import { ApplicationDocumentService } from '@bll/services/applications/ApplicationDocumentService';
import { ConfirmApplicationDocumentUploadRequestDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadRequestDto';
import { ConfirmApplicationDocumentUploadResponseDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadResponseDto';
import { GenerateApplicationDocumentDownloadResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentDownloadResponseDto';
import { GenerateApplicationDocumentUploadUrlRequestDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlRequestDto';
import { GenerateApplicationDocumentUploadUrlResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlResponseDto';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';

@Injectable()
export class CrmApplicationDocumentService {
  constructor(
    private readonly accessService: CrmApplicationAccessService,
    private readonly applicationDocumentService: ApplicationDocumentService,
  ) {}

  async generateUploadUrl(
    currentUserId: string,
    leadId: string,
    applicationId: string,
    applicationRequirementId: string,
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): Promise<GenerateApplicationDocumentUploadUrlResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.applicationDocumentService.generateUploadUrlForAuthorizedApplication(
      application,
      applicationRequirementId,
      dto,
      currentUserId,
    );
  }

  async confirmUpload(
    currentUserId: string,
    leadId: string,
    applicationId: string,
    applicationRequirementId: string,
    dto: ConfirmApplicationDocumentUploadRequestDto,
  ): Promise<ConfirmApplicationDocumentUploadResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.applicationDocumentService.confirmUploadForAuthorizedApplication(
      application,
      applicationRequirementId,
      dto,
      currentUserId,
    );
  }

  async generateDownloadUrl(
    currentUserId: string,
    leadId: string,
    applicationId: string,
    documentId: string,
  ): Promise<GenerateApplicationDocumentDownloadResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.applicationDocumentService.generateDownloadUrlForAuthorizedApplication(
      application,
      documentId,
    );
  }
}
