import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ApplicationActivities } from '@entity/entities/ApplicationActivities.entity';
import { ApplicationActivityType } from '@shared/enums/ApplicationActivityType.enum';
import { ApplicationActivityEntityType } from '@shared/enums/ApplicationActivityEntityType.enum';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';
import { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';

export interface CreateApplicationActivityInput {
  applicationId: string;
  activityType: ApplicationActivityType;
  entityType: ApplicationActivityEntityType;
  entityId: string;
  actedByUserId?: string;
  stageId?: string;
  statusId?: string;
  documentRequirementId?: string;
  applicationDocumentId?: string;
  documentVersionId?: string;
  fromValue?: string;
  toValue?: string;
  remarks?: string;
  metaData?: Record<string, unknown>;
}

export interface LogApplicationCreatedInput {
  applicationId: string;
  actedByUserId?: string;
  remarks?: string;
  metaData?: Record<string, unknown>;
}

export interface LogDocumentUploadedInput {
  applicationId: string;
  actedByUserId?: string;
  documentRequirementId: string;
  documentId: string;
  documentVersionId: string;
  documentScope: 'APPLICATION' | 'LEAD';
  fileName?: string | null;
  remarks?: string;
}

export interface LogDocumentStatusChangedInput {
  applicationId: string;
  actedByUserId?: string;
  documentRequirementId?: string;
  documentId: string;
  documentVersionId: string;
  documentScope: 'APPLICATION' | 'LEAD';
  fromStatus: ApplicationDocumentStatus;
  toStatus: ApplicationDocumentStatus;
  remarks?: string;
}

export interface LogRequirementStatusChangedInput {
  applicationId: string;
  actedByUserId?: string;
  documentRequirementId: string;
  fromStatus: ApplicationRequirementStatus;
  toStatus: ApplicationRequirementStatus;
  remarks?: string;
}

@Injectable()
export class ApplicationActivityService {
  async log(
    manager: EntityManager,
    input: CreateApplicationActivityInput,
  ): Promise<ApplicationActivities> {
    const repository = manager.getRepository(ApplicationActivities);

    const entity = repository.create({
      applicationId: input.applicationId,
      activityType: input.activityType,
      entityType: input.entityType,
      entityId: input.entityId,
      actedByUserId: input.actedByUserId,
      stageId: input.stageId,
      statusId: input.statusId,
      documentRequirementId: input.documentRequirementId,
      applicationDocumentId: input.applicationDocumentId,
      documentVersionId: input.documentVersionId,
      fromValue: input.fromValue,
      toValue: input.toValue,
      remarks: input.remarks,
      metaData: input.metaData,
    });

    return repository.save(entity);
  }

  async logApplicationCreated(
    manager: EntityManager,
    input: LogApplicationCreatedInput,
  ): Promise<ApplicationActivities> {
    return this.log(manager, {
      applicationId: input.applicationId,
      activityType: ApplicationActivityType.ApplicationCreated,
      entityType: ApplicationActivityEntityType.Application,
      entityId: input.applicationId,
      actedByUserId: input.actedByUserId,
      remarks: input.remarks,
      metaData: input.metaData,
    });
  }

  async logDocumentUploaded(
    manager: EntityManager,
    input: LogDocumentUploadedInput,
  ): Promise<ApplicationActivities> {
    return this.log(manager, {
      applicationId: input.applicationId,
      activityType: ApplicationActivityType.DocUploaded,
      entityType: ApplicationActivityEntityType.ApplicationDocumentVersion,
      entityId: input.documentVersionId,
      actedByUserId: input.actedByUserId,
      documentRequirementId: input.documentRequirementId,
      applicationDocumentId:
        input.documentScope === 'APPLICATION' ? input.documentId : undefined,
      documentVersionId:
        input.documentScope === 'APPLICATION'
          ? input.documentVersionId
          : undefined,
      fromValue: UploadStatus.PENDING,
      toValue: UploadStatus.UPLOADED,
      remarks: input.remarks,
      metaData: {
        documentScope: input.documentScope,
        documentId: input.documentId,
        documentVersionId: input.documentVersionId,
        fileName: input.fileName ?? null,
      },
    });
  }

  async logDocumentStatusChanged(
    manager: EntityManager,
    input: LogDocumentStatusChangedInput,
  ): Promise<ApplicationActivities> {
    return this.log(manager, {
      applicationId: input.applicationId,
      activityType: ApplicationActivityType.DocStatusChanged,
      entityType: ApplicationActivityEntityType.ApplicationDocumentVersion,
      entityId: input.documentVersionId,
      actedByUserId: input.actedByUserId,
      documentRequirementId: input.documentRequirementId,
      applicationDocumentId:
        input.documentScope === 'APPLICATION' ? input.documentId : undefined,
      documentVersionId:
        input.documentScope === 'APPLICATION'
          ? input.documentVersionId
          : undefined,
      fromValue: input.fromStatus,
      toValue: input.toStatus,
      remarks: input.remarks,
      metaData: {
        documentScope: input.documentScope,
        documentId: input.documentId,
        documentVersionId: input.documentVersionId,
      },
    });
  }

  async logRequirementStatusChanged(
    manager: EntityManager,
    input: LogRequirementStatusChangedInput,
  ): Promise<ApplicationActivities> {
    return this.log(manager, {
      applicationId: input.applicationId,
      activityType: ApplicationActivityType.RequirementStatusChanged,
      entityType: ApplicationActivityEntityType.ApplicationRequirement,
      entityId: input.documentRequirementId,
      actedByUserId: input.actedByUserId,
      documentRequirementId: input.documentRequirementId,
      fromValue: input.fromStatus,
      toValue: input.toStatus,
      remarks: input.remarks,
    });
  }
}
