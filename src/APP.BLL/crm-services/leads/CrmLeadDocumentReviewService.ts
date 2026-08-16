import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { LeadDocuments } from '@entity/entities/LeadDocuments.entity';
import { LeadDocumentVersions } from '@entity/entities/LeadDocumentVersions.entity';
import { ChangeCrmApplicationDocumentStatusRequestDto } from '@shared/dtos/applications/ChangeCrmApplicationDocumentStatusRequestDto';
import { ChangeCrmApplicationDocumentStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationDocumentStatusResponseDto';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { CrmApplicationDocumentReviewPolicy } from '@bll/crm-services/applications/helpers/CrmApplicationDocumentReviewPolicy';
import { CrmLeadScopedDocumentStatusApplier } from '@bll/crm-services/applications/helpers/CrmLeadScopedDocumentStatusApplier';
import { CrmLeadAccessService } from './helpers/CrmLeadAccessService';

@Injectable()
export class CrmLeadDocumentReviewService {
  constructor(
    private readonly db: AppDbContext,
    private readonly accessService: CrmLeadAccessService,
    private readonly reviewPolicy: CrmApplicationDocumentReviewPolicy,
    private readonly statusApplier: CrmLeadScopedDocumentStatusApplier,
  ) {}

  async changeLeadDocumentStatus(
    currentUserId: string,
    leadId: string,
    documentId: string,
    dto: ChangeCrmApplicationDocumentStatusRequestDto,
  ): Promise<ChangeCrmApplicationDocumentStatusResponseDto> {
    // await this.accessService.ensureCrmCanAccessLeadOrThrow(
    //   currentUserId,
    //   leadId,
    // );

    return this.db.transaction(async (manager) => {
      const reviewable = await this.resolveLeadDocumentOrThrow(
        manager,
        leadId,
        documentId,
      );
      const previousStatus = reviewable.previousDocumentStatus;

      this.reviewPolicy.validateDocumentStatusChangeOrThrow(
        previousStatus,
        dto.toStatus,
        dto.remarks,
      );

      if (previousStatus === dto.toStatus) {
        return {
          success: true,
          currentStatus: previousStatus,
          previousStatus,
        };
      }

      const plan = this.statusApplier.buildDocumentStatusTransitionPlan(
        dto.toStatus,
        currentUserId,
        dto.remarks,
      );

      await this.statusApplier.applyLeadScopedDocumentStatus(
        manager,
        reviewable,
        currentUserId,
        plan,
      );

      return {
        success: true,
        currentStatus: dto.toStatus,
        previousStatus,
      };
    });
  }

  private async resolveLeadDocumentOrThrow(
    manager: EntityManager,
    leadId: string,
    documentId: string,
  ): Promise<{
    document: LeadDocuments;
    version: LeadDocumentVersions;
    previousDocumentStatus: ApplicationDocumentStatus;
  }> {
    const document = await manager.getRepository(LeadDocuments).findOne({
      where: {
        id: documentId,
        leadId,
      },
    });

    if (!document || !document.currentLeadDocumentVersionId) {
      throw new NotFoundException('Document not found');
    }

    const version = await manager.getRepository(LeadDocumentVersions).findOne({
      where: {
        id: document.currentLeadDocumentVersionId,
        leadDocumentId: document.id,
      },
    });

    if (!version) {
      throw new NotFoundException('Document not found');
    }

    if (version.uploadStatus !== UploadStatus.UPLOADED) {
      throw new ValidationException('Document has not been uploaded');
    }

    return {
      document,
      version,
      previousDocumentStatus:
        document.overallStatus ?? ApplicationDocumentStatus.Pending,
    };
  }
}
