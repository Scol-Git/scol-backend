import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Applications } from '@entity/entities/Applications.entity';
import { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import { ApplicationDocumentVersions } from '@entity/entities/ApplicationDocumentVersions.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { LeadDocuments } from '@entity/entities/LeadDocuments.entity';
import { LeadDocumentVersions } from '@entity/entities/LeadDocumentVersions.entity';
import { ApplicationActivityService } from '@bll/services/applications/helpers/ApplicationActivityService';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ChangeCrmApplicationDocumentStatusRequestDto } from '@shared/dtos/applications/ChangeCrmApplicationDocumentStatusRequestDto';
import { ChangeCrmApplicationDocumentStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationDocumentStatusResponseDto';
import { ChangeCrmApplicationRequirementStatusRequestDto } from '@shared/dtos/applications/ChangeCrmApplicationRequirementStatusRequestDto';
import { ChangeCrmApplicationRequirementStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationRequirementStatusResponseDto';
import { ApplicationDocumentSourceType } from '@shared/enums/ApplicationDocumentSourceType.enum';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';
import { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';
import { CrmApplicationDocumentReviewPolicy } from './helpers/CrmApplicationDocumentReviewPolicy';
import {
  CrmLeadScopedDocumentStatusApplier,
  DocumentStatusTransitionPlan,
} from './helpers/CrmLeadScopedDocumentStatusApplier';

type ApplicationReviewableDocument = {
  documentScope: 'APPLICATION';
  document: ApplicationDocuments;
  version: ApplicationDocumentVersions;
  applicationRequirementId: string;
  previousDocumentStatus: ApplicationDocumentStatus;
};

type LeadReviewableDocument = {
  documentScope: 'LEAD';
  document: LeadDocuments;
  version: LeadDocumentVersions;
  applicationRequirementId: string;
  previousDocumentStatus: ApplicationDocumentStatus;
};

type ReviewableDocument =
  | ApplicationReviewableDocument
  | LeadReviewableDocument;

@Injectable()
export class CrmApplicationDocumentReviewService {
  constructor(
    private readonly db: AppDbContext,
    private readonly accessService: CrmApplicationAccessService,
    private readonly activityService: ApplicationActivityService,
    private readonly reviewPolicy: CrmApplicationDocumentReviewPolicy,
    private readonly leadDocumentStatusApplier: CrmLeadScopedDocumentStatusApplier,
  ) {}

  // #region changeDocumentStatus
  async changeDocumentStatus(
    currentUserId: string,
    leadId: string,
    applicationId: string,
    documentId: string,
    dto: ChangeCrmApplicationDocumentStatusRequestDto,
  ): Promise<ChangeCrmApplicationDocumentStatusResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.db.transaction(async (manager) => {
      const reviewable = await this.resolveReviewableDocumentOrThrow(
        manager,
        application,
        documentId,
      );

      const previousStatus = reviewable.previousDocumentStatus;

      this.reviewPolicy.validateDocumentStatusChangeOrThrow(
        previousStatus,
        dto.toStatus,
        dto.remarks,
      );

      if (previousStatus === dto.toStatus) {
        return this.toDocumentStatusResponse(previousStatus, previousStatus);
      }

      const plan = this.leadDocumentStatusApplier.buildDocumentStatusTransitionPlan(
        dto.toStatus,
        currentUserId,
        dto.remarks,
      );

      await this.applyDocumentStatusChange(
        manager,
        reviewable,
        currentUserId,
        plan,
      );

      // await this.updateRequirementStatusAfterDocumentStatusChangeIfNeeded(
      //   manager,
      //   {
      //     application,
      //     applicationRequirementId: reviewable.applicationRequirementId,
      //     documentScope: reviewable.documentScope,
      //     toDocumentStatus: dto.toStatus,
      //     remarks: dto.remarks,
      //   },
      // );

      await this.activityService.logDocumentStatusChanged(manager, {
        applicationId: application.id,
        actedByUserId: currentUserId,
        documentRequirementId: reviewable.applicationRequirementId,
        documentId: reviewable.document.id,
        documentVersionId: reviewable.version.id,
        documentScope: reviewable.documentScope,
        fromStatus: previousStatus,
        toStatus: dto.toStatus,
        remarks: dto.remarks,
      });

      return this.toDocumentStatusResponse(dto.toStatus, previousStatus);
    });
  }
  // #endregion

  // #region changeRequirementStatus
  async changeRequirementStatus(
    currentUserId: string,
    leadId: string,
    applicationId: string,
    applicationRequirementId: string,
    dto: ChangeCrmApplicationRequirementStatusRequestDto,
  ): Promise<ChangeCrmApplicationRequirementStatusResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.db.transaction(async (manager) => {
      const requirementRepo = manager.getRepository(
        ApplicationRequiredDocuments,
      );
      const requirement = await requirementRepo.findOne({
        where: {
          id: applicationRequirementId,
          applicationId: application.id,
        },
      });

      if (!requirement) {
        throw new NotFoundException('Application requirement not found');
      }

      this.ensureRequirementBelongsToCurrentStageOrThrow(
        requirement,
        application,
      );

      const previousStatus =
        requirement.overallStatus ?? ApplicationRequirementStatus.Pending;
      this.reviewPolicy.validateRequirementStatusChangeOrThrow(
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

      await this.validateRequirementStatusChangeAllowedOrThrow(
        manager,
        application,
        requirement,
        dto.toStatus,
      );

      requirement.overallStatus = dto.toStatus;
      requirement.remarks = dto.remarks ?? requirement.remarks;
      await requirementRepo.save(requirement);

      await this.activityService.logRequirementStatusChanged(manager, {
        applicationId: application.id,
        actedByUserId: currentUserId,
        documentRequirementId: requirement.id,
        fromStatus: previousStatus,
        toStatus: dto.toStatus,
        remarks: dto.remarks,
      });

      return {
        success: true,
        currentStatus: dto.toStatus,
        previousStatus,
      };
    });
  }
  // #endregion

  // #region Private methods : changeDocumentStatus

  // #region resolveReviewableDocumentOrThrow
  private async resolveReviewableDocumentOrThrow(
    manager: EntityManager,
    application: Applications,
    documentId: string,
  ): Promise<ReviewableDocument> {
    const applicationScoped = await this.resolveApplicationScopedDocumentOrNull(
      manager,
      application,
      documentId,
    );
    if (applicationScoped) {
      return applicationScoped;
    }

    const leadScoped = await this.resolveLeadScopedDocumentOrNull(
      manager,
      application,
      documentId,
    );
    if (leadScoped) {
      return leadScoped;
    }

    throw new NotFoundException('Document not found');
  }

  private async resolveApplicationScopedDocumentOrNull(
    manager: EntityManager,
    application: Applications,
    documentId: string,
  ): Promise<ApplicationReviewableDocument | null> {
    const documentRepo = manager.getRepository(ApplicationDocuments);
    const versionRepo = manager.getRepository(ApplicationDocumentVersions);

    const document = await documentRepo.findOne({
      where: {
        id: documentId,
        applicationId: application.id,
      },
    });

    if (!document || !document.currentVersionId) {
      return null;
    }

    const version = await versionRepo.findOne({
      where: {
        id: document.currentVersionId,
        applicationDocumentId: document.id,
      },
    });

    if (!version) {
      return null;
    }

    if (version.uploadStatus !== UploadStatus.UPLOADED) {
      throw new ValidationException('Document has not been uploaded');
    }

    return {
      documentScope: 'APPLICATION',
      document,
      version,
      applicationRequirementId: document.applicationRequirementId,
      previousDocumentStatus:
        document.overallStatus ?? ApplicationDocumentStatus.Pending,
    };
  }

  private async resolveLeadScopedDocumentOrNull(
    manager: EntityManager,
    application: Applications,
    documentId: string,
  ): Promise<LeadReviewableDocument | null> {
    if (!application.leadId) {
      return null;
    }

    const documentRepo = manager.getRepository(LeadDocuments);
    const versionRepo = manager.getRepository(LeadDocumentVersions);
    const requirementRepo = manager.getRepository(ApplicationRequiredDocuments);

    const document = await documentRepo.findOne({
      where: {
        id: documentId,
        leadId: application.leadId,
      },
    });

    if (!document || !document.currentLeadDocumentVersionId) {
      return null;
    }

    const version = await versionRepo.findOne({
      where: {
        id: document.currentLeadDocumentVersionId,
        leadDocumentId: document.id,
      },
    });

    if (!version) {
      return null;
    }

    if (version.uploadStatus !== UploadStatus.UPLOADED) {
      throw new ValidationException('Document has not been uploaded');
    }

    const requirement = await requirementRepo.findOne({
      where: {
        applicationId: application.id,
        sysApplicationStageId: application.currentSysApplicationStageId,
        sourceType: ApplicationDocumentSourceType.Lead,
        sysDocumentTypeId: document.sysDocumentTypeId,
      },
    });

    if (!requirement) {
      return null;
    }

    return {
      documentScope: 'LEAD',
      document,
      version,
      applicationRequirementId: requirement.id,
      previousDocumentStatus:
        document.overallStatus ?? ApplicationDocumentStatus.Pending,
    };
  }
  // #endregion

  // #region buildDocumentStatusTransitionPlan : changeDocumentStatus
  private async applyDocumentStatusChange(
    manager: EntityManager,
    reviewable: ReviewableDocument,
    actedByUserId: string,
    plan: DocumentStatusTransitionPlan,
  ): Promise<void> {
    if (reviewable.documentScope === 'APPLICATION') {
      await this.applyApplicationScopedDocumentStatus(
        manager,
        reviewable,
        actedByUserId,
        plan,
      );
      return;
    }

    await this.leadDocumentStatusApplier.applyLeadScopedDocumentStatus(
      manager,
      reviewable,
      actedByUserId,
      plan,
    );
  }

  private async applyApplicationScopedDocumentStatus(
    manager: EntityManager,
    reviewable: ApplicationReviewableDocument,
    actedByUserId: string,
    plan: DocumentStatusTransitionPlan,
  ): Promise<void> {
    const documentRepo = manager.getRepository(ApplicationDocuments);
    const versionRepo = manager.getRepository(ApplicationDocumentVersions);

    reviewable.document.overallStatus = plan.documentStatus;
    reviewable.document.updatedByUserId = actedByUserId;

    if (plan.remarks !== undefined) {
      reviewable.document.remarks = plan.remarks;
    }

    reviewable.version.verificationStatus = plan.verificationStatus;
    reviewable.version.verifiedByUserId = plan.verifiedByUserId;

    await versionRepo.save(reviewable.version);
    await documentRepo.save(reviewable.document);
  }
  // #endregion

  private async updateRequirementStatusAfterDocumentStatusChangeIfNeeded(
    manager: EntityManager,
    input: {
      application: Applications;
      applicationRequirementId: string;
      documentScope: 'APPLICATION' | 'LEAD';
      toDocumentStatus: ApplicationDocumentStatus;
      remarks?: string;
    },
  ): Promise<ApplicationRequiredDocuments> {
    const requirementRepo = manager.getRepository(ApplicationRequiredDocuments);
    const requirement = await requirementRepo.findOne({
      where: {
        id: input.applicationRequirementId,
        applicationId: input.application.id,
      },
    });

    if (!requirement) {
      throw new NotFoundException('Application requirement not found');
    }

    if (input.toDocumentStatus === ApplicationDocumentStatus.Rejected) {
      requirement.overallStatus = ApplicationRequirementStatus.Pending;
      requirement.remarks = input.remarks;
      return requirementRepo.save(requirement);
    }

    if (input.toDocumentStatus === ApplicationDocumentStatus.InProgress) {
      requirement.overallStatus = ApplicationRequirementStatus.InProgress;
      return requirementRepo.save(requirement);
    }

    if (input.toDocumentStatus === ApplicationDocumentStatus.Verified) {
      const requiredVerifiedCount = Math.max(1, requirement.minCount ?? 1);

      const verifiedDocumentCount =
        await this.countVerifiedDocumentsForRequirement(
          manager,
          input.application,
          requirement,
        );

      requirement.overallStatus =
        verifiedDocumentCount >= requiredVerifiedCount
          ? ApplicationRequirementStatus.Verified
          : ApplicationRequirementStatus.InProgress;

      return requirementRepo.save(requirement);
    }

    return requirement;
  }

  private toDocumentStatusResponse(
    currentStatus: ApplicationDocumentStatus,
    previousStatus: ApplicationDocumentStatus,
  ): ChangeCrmApplicationDocumentStatusResponseDto {
    return {
      success: true,
      currentStatus,
      previousStatus,
    };
  }
  // #endregion

  // #region Private methods : changeRequirementStatus
  private ensureRequirementBelongsToCurrentStageOrThrow(
    requirement: ApplicationRequiredDocuments,
    application: Applications,
  ): void {
    if (requirement.sysApplicationStageId == null) {
      throw new ValidationException(
        'Requirement is not associated with an application stage',
        { requirement: ['Requirement stage is missing'] },
      );
    }

    if (
      requirement.sysApplicationStageId !==
      application.currentSysApplicationStageId
    ) {
      throw new ValidationException(
        'Document requirement is not available in the current application stage',
        { requirement: ['Requirement does not belong to the current stage'] },
      );
    }
  }

  private async validateRequirementStatusChangeAllowedOrThrow(
    manager: EntityManager,
    application: Applications,
    requirement: ApplicationRequiredDocuments,
    toStatus: ApplicationRequirementStatus,
  ): Promise<void> {
    if (toStatus !== ApplicationRequirementStatus.Verified) {
      return;
    }

    if (requirement.isRequired !== true) {
      return;
    }

    const requiredVerifiedCount = Math.max(1, requirement.minCount ?? 1);

    const verifiedDocumentCount =
      await this.countVerifiedDocumentsForRequirement(
        manager,
        application,
        requirement,
      );

    if (verifiedDocumentCount < requiredVerifiedCount) {
      throw new ValidationException(
        'Requirement cannot be marked as verified',
        {
          requirement: [
            `At least ${requiredVerifiedCount} verified document(s) are required before marking this requirement as VERIFIED`,
          ],
        },
      );
    }
  }

  private async countVerifiedDocumentsForRequirement(
    manager: EntityManager,
    application: Applications,
    requirement: ApplicationRequiredDocuments,
  ): Promise<number> {
    if (requirement.sourceType === ApplicationDocumentSourceType.Application) {
      return manager.getRepository(ApplicationDocuments).count({
        where: {
          applicationId: application.id,
          applicationRequirementId: requirement.id,
          overallStatus: ApplicationDocumentStatus.Verified,
        },
      });
    }

    if (requirement.sourceType === ApplicationDocumentSourceType.Lead) {
      if (!application.leadId) {
        throw new ValidationException('Application has no lead', {
          application: ['leadId is required for lead-scoped documents'],
        });
      }

      return manager.getRepository(LeadDocuments).count({
        where: {
          leadId: application.leadId,
          sysDocumentTypeId: requirement.sysDocumentTypeId,
          overallStatus: ApplicationDocumentStatus.Verified,
        },
      });
    }

    return 0;
  }
  // #endregion
}
