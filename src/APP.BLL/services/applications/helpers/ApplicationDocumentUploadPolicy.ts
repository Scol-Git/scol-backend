import { Injectable } from '@nestjs/common';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { GenerateApplicationDocumentUploadUrlRequestDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlRequestDto';
import { ApplicationDocumentSourceType } from '@shared/enums/ApplicationDocumentSourceType.enum';
import { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';

@Injectable()
export class ApplicationDocumentUploadPolicy {
  validateUploadOrThrow(
    requirement: ApplicationRequiredDocuments,
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
    existingActiveDocumentCount: number,
  ): void {
    this.validateRequirementSourceScopeOrThrow(requirement);
    this.validateRequirementStatusOrThrow(requirement);
    this.validateMimeOrThrow(requirement, dto);
    this.validateFileSizeOrThrow(requirement, dto);
    this.validateSlotCountOrThrow(requirement, existingActiveDocumentCount);
  }

  private validateRequirementSourceScopeOrThrow(
    requirement: ApplicationRequiredDocuments,
  ): void {
    if (requirement.sourceType === ApplicationDocumentSourceType.Manual) {
      throw new ValidationException(
        'Upload is not supported for this requirement type',
        { requirement: ['Manual requirement source does not support upload'] },
      );
    }
  }

  private validateRequirementStatusOrThrow(
    requirement: ApplicationRequiredDocuments,
  ): void {
    const status =
      requirement.overallStatus ?? ApplicationRequirementStatus.Pending;

    if (
      status === ApplicationRequirementStatus.InProgress ||
      status === ApplicationRequirementStatus.Verified
    ) {
      throw new ValidationException(
        'Document Type is already uploaded for this application',
        {
          requirement: [
            'Document Type is already uploaded for this application',
          ],
        },
      );
    }
  }

  private validateMimeOrThrow(
    requirement: ApplicationRequiredDocuments,
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): void {
    const raw = requirement.allowedMimeTypes?.trim();

    if (!raw) {
      throw new ValidationException(
        'Document requirement has no allowed MIME types configured',
        {
          mimeType: [
            'Allowed MIME types are not configured for this requirement',
          ],
        },
      );
    }

    const allowedMimeTypes = raw
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);

    const requestedMimeType = dto.mimeType.trim().toLowerCase();

    if (!allowedMimeTypes.includes(requestedMimeType)) {
      throw new ValidationException(
        'MIME type is not allowed for this requirement',
        {
          mimeType: [`MIME type ${dto.mimeType} is not allowed`],
        },
      );
    }
  }

  private validateFileSizeOrThrow(
    requirement: ApplicationRequiredDocuments,
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): void {
    if (
      requirement.maxFileSizeBytes != null &&
      dto.fileSizeBytes > requirement.maxFileSizeBytes
    ) {
      throw new ValidationException('File size exceeds maximum allowed', {
        fileSizeBytes: [
          `Maximum size is ${requirement.maxFileSizeBytes} bytes for this requirement`,
        ],
      });
    }
  }

  private validateSlotCountOrThrow(
    requirement: ApplicationRequiredDocuments,
    existingActiveDocumentCount: number,
  ): void {
    if (!requirement.isMultipleAllowed && existingActiveDocumentCount >= 1) {
      throw new ValidationException(
        'Invalid document state: multiple active documents for a single-upload requirement',
        { requirement: ['Too many active documents for this requirement'] },
      );
    }

    if (requirement.isMultipleAllowed && requirement.maxCount <= 0) {
      throw new ValidationException(
        'Invalid requirement configuration: maxCount must be greater than 0',
        {
          requirement: [
            'maxCount must be greater than 0 for multi-upload requirements',
          ],
        },
      );
    }

    if (
      requirement.isMultipleAllowed &&
      existingActiveDocumentCount >= requirement.maxCount
    ) {
      throw new ValidationException(
        'Invalid document state: more active documents than configured for this requirement',
        {
          requirement: [
            `Expected at most ${requirement.maxCount} active document(s) for this requirement`,
          ],
        },
      );
    }
  }
}
