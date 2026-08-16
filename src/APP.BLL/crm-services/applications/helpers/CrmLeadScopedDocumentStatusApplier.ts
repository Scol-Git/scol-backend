import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LeadDocuments } from '@entity/entities/LeadDocuments.entity';
import { LeadDocumentVersions } from '@entity/entities/LeadDocumentVersions.entity';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';
import { VerificationStatus } from '@shared/enums/VerificationStatus.enum';

export type LeadScopedDocumentStatusTarget = {
  document: LeadDocuments;
  version: LeadDocumentVersions;
};

export type DocumentStatusTransitionPlan = {
  documentStatus: ApplicationDocumentStatus;
  verificationStatus: VerificationStatus;
  verifiedByUserId?: string;
  verifiedAt?: Date;
  remarks?: string;
};

@Injectable()
export class CrmLeadScopedDocumentStatusApplier {
  buildDocumentStatusTransitionPlan(
    toStatus: ApplicationDocumentStatus,
    actedByUserId: string,
    remarks?: string,
  ): DocumentStatusTransitionPlan {
    if (toStatus === ApplicationDocumentStatus.Verified) {
      return {
        documentStatus: ApplicationDocumentStatus.Verified,
        verificationStatus: VerificationStatus.VERIFIED,
        verifiedByUserId: actedByUserId,
        verifiedAt: new Date(),
        remarks,
      };
    }

    if (toStatus === ApplicationDocumentStatus.Rejected) {
      return {
        documentStatus: ApplicationDocumentStatus.Rejected,
        verificationStatus: VerificationStatus.REJECTED,
        verifiedByUserId: actedByUserId,
        verifiedAt: new Date(),
        remarks,
      };
    }

    return {
      documentStatus: ApplicationDocumentStatus.InProgress,
      verificationStatus: VerificationStatus.PENDING,
      remarks,
    };
  }

  async applyLeadScopedDocumentStatus(
    manager: EntityManager,
    reviewable: LeadScopedDocumentStatusTarget,
    actedByUserId: string,
    plan: DocumentStatusTransitionPlan,
  ): Promise<void> {
    const documentRepo = manager.getRepository(LeadDocuments);
    const versionRepo = manager.getRepository(LeadDocumentVersions);

    reviewable.document.overallStatus = plan.documentStatus;
    reviewable.document.verificationStatus = plan.verificationStatus;
    reviewable.document.updatedByUserId = actedByUserId;

    reviewable.version.verificationStatus = plan.verificationStatus;
    reviewable.version.verifiedByUserId = plan.verifiedByUserId;
    if (plan.verifiedAt !== undefined) {
      reviewable.version.verifiedAt = plan.verifiedAt;
    }

    await versionRepo.save(reviewable.version);
    await documentRepo.save(reviewable.document);
  }
}
