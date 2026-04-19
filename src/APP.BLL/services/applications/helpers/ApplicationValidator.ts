import { Injectable } from '@nestjs/common';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { CreateApplicationRequestDto } from '@shared/dtos/applications/CreateApplicationRequestDto';
import { GenerateApplicationDocumentUploadUrlRequestDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlRequestDto';

@Injectable()
export class ApplicationValidator {
  async validateCreateApplicationRequest(
    dto: CreateApplicationRequestDto,
  ): Promise<void> {
    const errors: string[] = [];

    if (!dto.universityId?.trim()) {
      errors.push('universityId is required');
    }

    if (!dto.courseId?.trim()) {
      errors.push('courseId is required');
    }

    if (!dto.intake) {
      errors.push('intake is required');
    } else {
      if (dto.intake.intakeMonth == null) {
        errors.push('intake.intakeMonth is required');
      } else if (dto.intake.intakeMonth < 1 || dto.intake.intakeMonth > 12) {
        errors.push('intake.intakeMonth must be between 1 and 12');
      }

      if (dto.intake.intakeYear == null) {
        errors.push('intake.intakeYear is required');
      } else if (dto.intake.intakeYear < 2000 || dto.intake.intakeYear > 2100) {
        errors.push('intake.intakeYear is out of acceptable range');
      }
    }

    if (errors.length > 0) {
      throw new ValidationException('Create application request is invalid', {
        createApplication: errors,
      });
    }
  }

  async validateGenerateUploadUrlRequest(
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): Promise<void> {
    const errors: string[] = [];

    if (!dto.fileName?.trim()) {
      errors.push('fileName is required');
    }

    if (!dto.mimeType?.trim()) {
      errors.push('mimeType is required');
    }

    if (dto.fileSizeBytes == null || dto.fileSizeBytes <= 0) {
      errors.push('fileSizeBytes is required and must be greater than 0');
    }

    if (errors.length > 0) {
      throw new ValidationException('Generate upload URL request is invalid', {
        generateUploadUrl: errors,
      });
    }
  }
}
