import { Injectable } from '@nestjs/common';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';
import { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';
import { ValidationException } from '@shared/exceptions/ValidationException';

@Injectable()
export class CrmApplicationDocumentReviewPolicy {
  private readonly allowedDocumentStatuses = new Set<ApplicationDocumentStatus>(
    [
      ApplicationDocumentStatus.InProgress,
      ApplicationDocumentStatus.Verified,
      ApplicationDocumentStatus.Rejected,
    ],
  );

  private readonly allowedRequirementStatuses =
    new Set<ApplicationRequirementStatus>([
      ApplicationRequirementStatus.Pending,
      ApplicationRequirementStatus.InProgress,
      ApplicationRequirementStatus.Verified,
    ]);

  validateDocumentStatusChangeOrThrow(
    currentStatus: ApplicationDocumentStatus | null | undefined,
    toStatus: ApplicationDocumentStatus,
    remarks?: string,
  ): void {
    if (!this.allowedDocumentStatuses.has(toStatus)) {
      throw new ValidationException('Invalid document status transition', {
        toStatus: [
          'Document status can only be IN_PROGRESS, VERIFIED, or REJECTED',
        ],
      });
    }

    const fromStatus = currentStatus ?? ApplicationDocumentStatus.Pending;

    if (this.requiresDocumentRemarks(fromStatus, toStatus, remarks)) {
      throw new ValidationException(
        'Remarks are required for this document status change',
        {
          remarks: [this.getDocumentRemarksMessage(fromStatus, toStatus)],
        },
      );
    }
  }

  validateRequirementStatusChangeOrThrow(
    currentStatus: ApplicationRequirementStatus | null | undefined,
    toStatus: ApplicationRequirementStatus,
    remarks?: string,
  ): void {
    if (!this.allowedRequirementStatuses.has(toStatus)) {
      throw new ValidationException('Invalid requirement status transition', {
        toStatus: [
          'Requirement status can only be PENDING, IN_PROGRESS, or VERIFIED',
        ],
      });
    }

    const fromStatus = currentStatus ?? ApplicationRequirementStatus.Pending;

    if (
      fromStatus !== toStatus &&
      toStatus === ApplicationRequirementStatus.Pending &&
      !this.hasNonEmptyText(remarks)
    ) {
      throw new ValidationException(
        'Remarks are required when setting requirement to pending',
        {
          remarks: ['Remarks are required when requirement status is PENDING'],
        },
      );
    }
  }

  private hasNonEmptyText(value?: string): boolean {
    return Boolean(value && value.trim().length > 0);
  }

  private requiresDocumentRemarks(
    fromStatus: ApplicationDocumentStatus,
    toStatus: ApplicationDocumentStatus,
    remarks?: string,
  ): boolean {
    if (toStatus === ApplicationDocumentStatus.Rejected) {
      return !this.hasNonEmptyText(remarks);
    }

    const isReopeningVerifiedDocument =
      fromStatus === ApplicationDocumentStatus.Verified &&
      toStatus === ApplicationDocumentStatus.InProgress;

    return isReopeningVerifiedDocument && !this.hasNonEmptyText(remarks);
  }

  private getDocumentRemarksMessage(
    fromStatus: ApplicationDocumentStatus,
    toStatus: ApplicationDocumentStatus,
  ): string {
    if (toStatus === ApplicationDocumentStatus.Rejected) {
      return 'Remarks are required when document status is REJECTED';
    }

    if (
      fromStatus === ApplicationDocumentStatus.Verified &&
      toStatus === ApplicationDocumentStatus.InProgress
    ) {
      return 'Remarks are required when changing document status from VERIFIED to IN_PROGRESS';
    }

    return 'Remarks are required for this document status change';
  }
}
