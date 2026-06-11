import { Injectable } from '@nestjs/common';
import { ApplicationActivities } from '@entity/entities/ApplicationActivities.entity';
import { CrmApplicationActivityItemDto } from '@shared/dtos/applications/CrmApplicationActivityItemDto';
import { GetCrmApplicationActivitiesResponseDto } from '@shared/dtos/applications/GetCrmApplicationActivitiesResponseDto';
import { ApplicationActivityType } from '@shared/enums/ApplicationActivityType.enum';

@Injectable()
export class CrmApplicationActivityMapper {
  toGetCrmApplicationActivitiesResponse(
    applicationId: string,
    activities: ApplicationActivities[],
    actorDisplayNamesByUserId: ReadonlyMap<string, string | null>,
  ): GetCrmApplicationActivitiesResponseDto {
    return {
      applicationId,
      activities: activities.map((activity) =>
        this.toCrmApplicationActivityItem(activity, actorDisplayNamesByUserId),
      ),
    };
  }

  private toCrmApplicationActivityItem(
    activity: ApplicationActivities,
    actorDisplayNamesByUserId: ReadonlyMap<string, string | null>,
  ): CrmApplicationActivityItemDto {
    const baseDescription = this.toActivityDescription(activity);
    const description = this.appendRemarks(baseDescription, activity.remarks);

    return {
      activityId: activity.id,
      activityType: activity.activityType,
      title: this.toActivityTitle(activity.activityType),
      description,
      occurredAt: activity.createdAt.toISOString(),
      actor: activity.actedByUserId
        ? {
            userId: activity.actedByUserId,
            displayName:
              actorDisplayNamesByUserId.get(activity.actedByUserId) ?? null,
          }
        : null,
      remarks: activity.remarks ?? null,
      metaData: activity.metaData ?? null,
    };
  }

  private toActivityTitle(activityType: ApplicationActivityType): string {
    switch (activityType) {
      case ApplicationActivityType.ApplicationCreated:
        return 'Application Started';
      case ApplicationActivityType.StageChanged:
        return 'Stage Updated';
      case ApplicationActivityType.StatusChanged:
        return 'Status Updated';
      case ApplicationActivityType.DocumentRequirementChanged:
        return 'Document Requirement Changed';
      case ApplicationActivityType.DocumentChanged:
        return 'Document Changed';
      case ApplicationActivityType.DocumentVersionChanged:
        return 'Document Version Changed';
      case ApplicationActivityType.DocUploaded:
        return 'Document Uploaded';
      case ApplicationActivityType.DocDeleted:
        return 'Document Deleted';
      case ApplicationActivityType.DocRejected:
        return 'Document Rejected';
      case ApplicationActivityType.DocReuploaded:
        return 'Document Re-uploaded';
      case ApplicationActivityType.DocVerified:
        return 'Document Verified';
      case ApplicationActivityType.DocStatusChanged:
        return 'Document Status Updated';
      case ApplicationActivityType.RequirementStatusChanged:
        return 'Requirement Status Updated';
      default:
        return this.formatActivityTypeFallbackTitle(activityType);
    }
  }

  private toActivityDescription(activity: ApplicationActivities): string {
    const fileName = this.getActivityFileName(activity.metaData);

    switch (activity.activityType) {
      case ApplicationActivityType.ApplicationCreated:
        return 'Application created.';
      case ApplicationActivityType.StageChanged:
        return this.formatTransitionDescription(
          'Stage changed',
          activity.fromValue,
          activity.toValue,
        );
      case ApplicationActivityType.StatusChanged:
        return this.formatTransitionDescription(
          'Status changed',
          activity.fromValue,
          activity.toValue,
        );
      case ApplicationActivityType.DocUploaded:
        return fileName ? `${fileName} uploaded.` : 'Document uploaded.';
      case ApplicationActivityType.DocDeleted:
        return fileName ? `${fileName} deleted.` : 'Document deleted.';
      case ApplicationActivityType.DocStatusChanged:
        return this.formatTransitionDescription(
          'Document status changed',
          activity.fromValue,
          activity.toValue,
        );
      case ApplicationActivityType.RequirementStatusChanged:
        return this.formatTransitionDescription(
          'Requirement status changed',
          activity.fromValue,
          activity.toValue,
        );
      case ApplicationActivityType.DocRejected:
        return fileName ? `${fileName} rejected.` : 'Document rejected.';
      case ApplicationActivityType.DocReuploaded:
        return fileName ? `${fileName} re-uploaded.` : 'Document re-uploaded.';
      case ApplicationActivityType.DocVerified:
        return fileName ? `${fileName} verified.` : 'Document verified.';
      case ApplicationActivityType.DocumentRequirementChanged:
        return 'Document requirement changed.';
      case ApplicationActivityType.DocumentChanged:
        return 'Document changed.';
      case ApplicationActivityType.DocumentVersionChanged:
        return 'Document version changed.';
      default:
        return `${this.toActivityTitle(activity.activityType)}.`;
    }
  }

  private appendRemarks(
    description: string,
    remarks?: string | null,
  ): string | null {
    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      return null;
    }

    const trimmedRemarks = remarks?.trim();
    if (!trimmedRemarks) {
      return trimmedDescription;
    }

    if (
      trimmedRemarks.localeCompare(trimmedDescription, undefined, {
        sensitivity: 'accent',
      }) === 0
    ) {
      return trimmedDescription;
    }

    const normalizedRemarks = trimmedRemarks.endsWith('.')
      ? trimmedRemarks
      : `${trimmedRemarks}.`;

    return `${trimmedDescription} ${normalizedRemarks}`;
  }

  private formatTransitionDescription(
    prefix: string,
    fromValue?: string | null,
    toValue?: string | null,
  ): string {
    if (fromValue && toValue) {
      return `${prefix} from ${fromValue} to ${toValue}.`;
    }

    if (toValue) {
      return `${prefix} to ${toValue}.`;
    }

    if (fromValue) {
      return `${prefix} from ${fromValue}.`;
    }

    return `${prefix}.`;
  }

  private getActivityFileName(
    metaData?: Record<string, unknown> | null,
  ): string | null {
    const fileName = metaData?.fileName;
    if (typeof fileName !== 'string') {
      return null;
    }

    const trimmed = fileName.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private formatActivityTypeFallbackTitle(
    activityType: ApplicationActivityType,
  ): string {
    return activityType
      .split('_')
      .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
      .join(' ');
  }
}
