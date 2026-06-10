import { Injectable } from '@nestjs/common';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { Applications } from '@entity/entities/Applications.entity';
import { SysApplicationStage } from '@entity/entities/SysApplicationStage.entity';
import { SysApplicationStatus } from '@entity/entities/SysApplicationStatus.entity';
import { SysUniversities } from '@entity/entities/SysUniversities.entity';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { UniCourses } from '@entity/entities/UniCourses.entity';
import { CreateApplicationResponseDto } from '@shared/dtos/applications/CreateApplicationResponseDto';
import { ApplicationDocumentChecklistItemDto } from '@shared/dtos/applications/ApplicationDocumentChecklistItemDto';
import { ApplicationListItemDto } from '@shared/dtos/applications/ApplicationListItemDto';
import {
  ApplicationOverviewAssignedToDto,
  ApplicationOverviewCourseInfoDto,
  ApplicationOverviewCurrentStageDto,
  ApplicationOverviewCurrentStatusDto,
  ApplicationOverviewDto,
  ApplicationOverviewUniversityInfoDto,
} from '@shared/dtos/applications/ApplicationOverviewDto';
import { ApplicationUploadedDocumentDto } from '@shared/dtos/applications/ApplicationUploadedDocumentDto';
import { ApplicationDocumentProgressItemDto } from '@shared/dtos/applications/ApplicationDocumentProgressItemDto';
import { ConfirmApplicationDocumentUploadResponseDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadResponseDto';
import { GetApplicationDocumentProgressResponseDto } from '@shared/dtos/applications/GetApplicationDocumentProgressResponseDto';
import { GenerateApplicationDocumentDownloadResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentDownloadResponseDto';
import { GenerateApplicationDocumentUploadUrlResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlResponseDto';
import { CrmApplicationStageDocumentChecklistDto } from '@shared/dtos/applications/CrmApplicationStageDocumentChecklistDto';
import { GetApplicationDetailsResponseDto } from '@shared/dtos/applications/GetApplicationDetailsResponseDto';
import { GetCrmApplicationDetailsResponseDto } from '@shared/dtos/applications/GetCrmApplicationDetailsResponseDto';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { GetApplicationStageProgressResponseDto } from '@shared/dtos/applications/GetApplicationStageProgressResponseDto';
import { ApplicationDocumentChecklistDocumentTypeDto } from '@shared/dtos/applications/ApplicationDocumentChecklistItemDto';
import { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';
import {
  ApplicationRequirementWithDocuments,
  ApplicationStageRequirementsWithDocuments,
  DocumentProgressViewModel,
  StageProgressViewModel,
  UploadedDocumentView,
} from './application-read-model.types';
import { SysConsultantProfiles } from '@entity/entities/SysConsultantProfiles.entity';

const MONTH_NAMES_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

@Injectable()
export class ApplicationMapper {
  toCreateApplicationResponse(
    applicationId: string,
  ): CreateApplicationResponseDto {
    return {
      success: true,
      applicationId,
    };
  }

  toGenerateUploadUrlResponse(input: {
    documentId: string;
    documentVersionId: string;
    uploadUrl: string;
    mimeType: string;
    expiresInSeconds: number;
  }): GenerateApplicationDocumentUploadUrlResponseDto {
    return {
      documentId: input.documentId,
      documentVersionId: input.documentVersionId,
      uploadUrl: input.uploadUrl,
      headers: {
        'Content-Type': input.mimeType,
      },
      expiresInSeconds: input.expiresInSeconds,
    };
  }

  toConfirmUploadResponse(
    status: UploadStatus,
  ): ConfirmApplicationDocumentUploadResponseDto {
    return {
      success: true,
      status,
    };
  }

  toDownloadResponse(input: {
    url: string;
    expiresInSeconds: number;
    fileName: string;
  }): GenerateApplicationDocumentDownloadResponseDto {
    return {
      url: input.url,
      expiresInSeconds: input.expiresInSeconds,
      fileName: input.fileName,
    };
  }

  toApplicationListItem(
    application: Applications,
    displayStage?: SysApplicationStage,
  ): ApplicationListItemDto {
    const intake = application.UniCourseIntake;
    const course = intake?.UniCourse;
    const university = course?.SysUniversity;
    const stage = displayStage ?? application.CurrentSysApplicationStage;
    const status = application.CurrentSysApplicationStatus;

    if (!intake || !course || !university || !stage || !status) {
      throw new Error(
        'Application list mapping failed: required relations not loaded',
      );
    }

    return {
      applicationId: application.id,
      applicationOverview: {
        universityInfo: this.mapUniversityInfo(university),
        courseInfo: this.mapCourseInfo(course),
        intakeInfo: {
          intakeId: intake.id,
          intakeName: this.formatIntakeName(
            intake.intakeMonth,
            intake.intakeYear,
          ),
        },
        currentStage: {
          stageCode: stage.stageCode,
          stageName: stage.stageName ?? stage.stageCode,
        },
        currentStatus: {
          statusCode: status.statusCode,
          statusName: status.statusName ?? status.statusCode,
        },
        lastUpdatedAt: application.updatedAt.toISOString(),
      },
    };
  }

  toGetApplicationsResponse(
    items: ApplicationListItemDto[],
  ): GetApplicationsResponseDto {
    return { applications: items };
  }

  toStageProgressResponse(
    input: StageProgressViewModel,
  ): GetApplicationStageProgressResponseDto {
    const current = input.currentStage;
    return {
      totalStages: input.totalStages,
      completedStages: input.completedStages,
      currentStage: {
        stageCode: current.stageCode,
        stageName: current.stageName ?? current.stageCode,
      },
      progressBarItems: input.items.map((row) => ({
        stageCode: row.stage.stageCode,
        stageName: row.stage.stageName ?? row.stage.stageCode,
        order: row.stage.stageOrder!,
        state: row.state,
      })),
    };
  }

  toDocumentProgressResponse(
    input: DocumentProgressViewModel,
  ): GetApplicationDocumentProgressResponseDto {
    return {
      totalRequired: input.totalRequired,
      uploadedCount: input.uploadedCount,
      progressBarItems: input.items.map((row) =>
        this.toApplicationDocumentProgressItem(row.requirement, row.order),
      ),
    };
  }

  toGetApplicationDetailsResponse(
    application: Applications,
    requirementsWithDocuments: ApplicationRequirementWithDocuments[],
    displayStage?: SysApplicationStage,
  ): GetApplicationDetailsResponseDto {
    const overview = this.toApplicationOverviewDto(application, displayStage);

    const documentCheckLists: ApplicationDocumentChecklistItemDto[] =
      requirementsWithDocuments.map((row) =>
        this.toApplicationDocumentChecklistItem(
          row.requirement,
          row.uploadedDocuments,
        ),
      );

    return {
      applicationId: application.id,
      applicationSerialNumber: application.serialNumber ?? null,
      applicationOverview: overview,
      documentCheckLists,
    };
  }

  toGetCrmApplicationDetailsResponse(
    application: Applications,
    stageRequirementsWithDocuments: ApplicationStageRequirementsWithDocuments[],
    displayStage?: SysApplicationStage,
  ): GetCrmApplicationDetailsResponseDto {
    const overview = this.toApplicationOverviewDto(application, displayStage);

    const documentCheckLists: CrmApplicationStageDocumentChecklistDto[] =
      stageRequirementsWithDocuments.map((stageGroup) => ({
        stageCode: stageGroup.stage.stageCode,
        stageName: stageGroup.stage.stageName ?? stageGroup.stage.stageCode,
        order: stageGroup.stage.stageOrder ?? null,
        documentChecklistItems: stageGroup.requirementsWithDocuments.map(
          (row) =>
            this.toApplicationDocumentChecklistItem(
              row.requirement,
              row.uploadedDocuments,
            ),
        ),
      }));

    return {
      applicationId: application.id,
      applicationSerialNumber: application.serialNumber ?? null,
      applicationOverview: overview,
      documentCheckLists,
    };
  }

  private toApplicationOverviewDto(
    application: Applications,
    displayStage?: SysApplicationStage,
  ): ApplicationOverviewDto {
    const intake = application.UniCourseIntake;
    const course = intake?.UniCourse;
    const university = course?.SysUniversity;
    const stage = displayStage ?? application.CurrentSysApplicationStage;
    const status = application.CurrentSysApplicationStatus;

    if (!intake || !course || !university || !stage || !status) {
      throw new Error(
        'Application details mapping failed: required overview relations not loaded',
      );
    }

    return {
      universityInfo: this.mapUniversityInfo(university),
      courseInfo: this.mapCourseInfo(course),
      intakeInfo: {
        intakeMonth: this.formatIntakeMonthOnly(intake.intakeMonth),
        intakeYear: String(intake.intakeYear),
      },
      currentStage: this.mapDetailCurrentStage(stage),
      currentStatus: this.mapDetailCurrentStatus(status),
      appliedDate: application.submittedAt
        ? application.submittedAt.toISOString()
        : null,
      lastUpdatedAt: application.updatedAt.toISOString(),
      assignedTo: this.mapAssignedCounsellor(
        application.AssignedToConsultant ?? null,
      ),
    };
  }

  private mapUniversityInfo(
    university: SysUniversities,
  ): ApplicationOverviewUniversityInfoDto {
    return {
      universityId: university.id,
      universityName: university.uniName,
      universityLogoUrl: university.logoUrl ?? null,
      universityCoverImageUrl: university.coverImageUrl ?? null,
    };
  }

  private mapCourseInfo(course: UniCourses): ApplicationOverviewCourseInfoDto {
    return {
      courseId: course.id,
      courseName: course.courseName,
    };
  }

  private mapDetailCurrentStage(
    stage: SysApplicationStage,
  ): ApplicationOverviewCurrentStageDto {
    return {
      stageCode: stage.stageCode,
      stageName: stage.stageName ?? stage.stageCode,
      stageInformation: stage.stageInformation ?? null,
    };
  }

  private mapDetailCurrentStatus(
    status: SysApplicationStatus,
  ): ApplicationOverviewCurrentStatusDto {
    return {
      statusCode: status.statusCode,
      statusName: status.statusName ?? status.statusCode,
    };
  }

  private mapAssignedCounsellor(
    consultant: SysConsultantProfiles | null,
  ): ApplicationOverviewAssignedToDto | null {
    if (consultant == null) {
      return null;
    }
    return {
      counsellorId: consultant.id,
      counsellorName: consultant.fullName,
    };
  }

  private toApplicationDocumentProgressItem(
    requirement: ApplicationRequiredDocuments,
    order: number,
  ): ApplicationDocumentProgressItemDto {
    const dt = requirement.SysDocumentType;
    if (!dt) {
      throw new Error(
        'Application document progress mapping failed: SysDocumentType not loaded',
      );
    }

    const documentType: ApplicationDocumentChecklistDocumentTypeDto = {
      documentTypeId: requirement.id,
      documentTypeCode: dt.documentTypeCode,
      documentTypeName: dt.documentTypeName,
    };

    return {
      documentType,
      order,
      overallStatus:
        requirement.overallStatus ?? ApplicationRequirementStatus.Pending,
    };
  }

  private toApplicationDocumentChecklistItem(
    requirement: ApplicationRequiredDocuments,
    uploadedDocuments: UploadedDocumentView[],
  ): ApplicationDocumentChecklistItemDto {
    const dt = requirement.SysDocumentType;
    if (!dt) {
      throw new Error(
        'Application checklist mapping failed: SysDocumentType not loaded',
      );
    }

    return {
      documentType: {
        documentTypeId: requirement.id,
        documentTypeCode: dt.documentTypeCode,
        documentTypeName: dt.documentTypeName,
      },
      isRequired: requirement.isRequired !== false,
      isMultipleAllowed: requirement.isMultipleAllowed,
      overallStatus:
        requirement.overallStatus ?? ApplicationRequirementStatus.Pending,
      allowedMimeTypes: requirement.allowedMimeTypes ?? null,
      maxFileSizeBytes: requirement.maxFileSizeBytes ?? null,
      uploadedDocuments: uploadedDocuments.map((d) =>
        this.toApplicationUploadedDocumentDto(d),
      ),
    };
  }

  private toApplicationUploadedDocumentDto(
    uploadedDocument: UploadedDocumentView,
  ): ApplicationUploadedDocumentDto {
    return {
      applicationDocumentId: uploadedDocument.documentId,
      fileName: uploadedDocument.fileName ?? null,
      overallStatus: uploadedDocument.overallStatus ?? null,
    };
  }

  private formatIntakeName(intakeMonth: number, intakeYear: number): string {
    return `${this.formatIntakeMonthOnly(intakeMonth)} ${intakeYear}`;
  }

  private formatIntakeMonthOnly(intakeMonth: number): string {
    const idx = intakeMonth - 1;
    if (idx >= 0 && idx < MONTH_NAMES_EN.length) {
      return MONTH_NAMES_EN[idx];
    }
    return `Month ${intakeMonth}`;
  }
}
