import { Injectable } from '@nestjs/common';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { GenerateApplicationDocumentUploadUrlRequestDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlRequestDto';
import { ApplicationRequirementOverallStatus } from '@shared/enums/ApplicationRequirementOverallStatus.enum';
import { ApplicationDocumentSourceType } from '@shared/enums/ApplicationDocumentSourceType.enum';

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
    if (
      requirement.overallStatus ===
        ApplicationRequirementOverallStatus.Satisfied ||
      requirement.overallStatus === ApplicationRequirementOverallStatus.Uploaded
    ) {
      throw new ValidationException(
        'Document Type is already uploaded or satisfied',
        {
          requirement: ['Document Type is already uploaded or satisfied'],
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
    if (!requirement.isMultipleAllowed) {
      // Single slot: 0 = first upload; 1 = re-upload via same endpoint (reuse aggregate + new version).
      // Do not compare to maxCount here — one active row is always valid for re-upload.
      if (existingActiveDocumentCount > 1) {
        throw new ValidationException(
          'Invalid document state: multiple active documents for a single-upload requirement',
          { requirement: ['Too many active documents for this requirement'] },
        );
      }
      return;
    }

    if (requirement.maxCount <= 0) {
      throw new ValidationException(
        'Invalid requirement configuration: maxCount must be greater than 0',
        {
          requirement: [
            'maxCount must be greater than 0 for multi-upload requirements',
          ],
        },
      );
    }
    if (existingActiveDocumentCount > requirement.maxCount) {
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
