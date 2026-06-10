import { Injectable } from '@nestjs/common';
import { In } from 'typeorm';
import { ApplicationQueryService } from '@bll/services/applications/ApplicationQueryService';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { GetCrmApplicationDetailsResponseDto } from '@shared/dtos/applications/GetCrmApplicationDetailsResponseDto';
import { GetApplicationDocumentProgressResponseDto } from '@shared/dtos/applications/GetApplicationDocumentProgressResponseDto';
import { GetApplicationStageProgressResponseDto } from '@shared/dtos/applications/GetApplicationStageProgressResponseDto';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { GetCrmApplicationActivitiesResponseDto } from '@shared/dtos/applications/GetCrmApplicationActivitiesResponseDto';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';
import { CrmApplicationActivityMapper } from './helpers/CrmApplicationActivityMapper';

@Injectable()
export class CrmApplicationQueryService {
  constructor(
    private readonly db: AppDbContext,
    private readonly accessService: CrmApplicationAccessService,
    private readonly applicationQueryService: ApplicationQueryService,
    private readonly activityMapper: CrmApplicationActivityMapper,
  ) {}

  async getApplicationsForLead(
    currentUserId: string,
    leadId: string,
  ): Promise<GetApplicationsResponseDto> {
    await this.accessService.ensureCrmCanAccessLeadOrThrow(
      currentUserId,
      leadId,
    );
    return this.applicationQueryService.getApplicationsForAuthorizedLead(
      leadId,
      'CRM',
    );
  }

  async getApplicationDetails(
    currentUserId: string,
    leadId: string,
    applicationId: string,
  ): Promise<GetCrmApplicationDetailsResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.applicationQueryService.getCrmApplicationDetailsForAuthorizedApplication(
      application.id,
    );
  }

  async getApplicationStageProgress(
    currentUserId: string,
    leadId: string,
    applicationId: string,
  ): Promise<GetApplicationStageProgressResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.applicationQueryService.getApplicationStageProgressForAuthorizedApplication(
      application.id,
      'CRM',
    );
  }

  async getApplicationDocumentProgress(
    currentUserId: string,
    leadId: string,
    applicationId: string,
  ): Promise<GetApplicationDocumentProgressResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    return this.applicationQueryService.getApplicationDocumentProgressForAuthorizedApplication(
      application.id,
      'CRM',
    );
  }

  async getApplicationActivities(
    currentUserId: string,
    leadId: string,
    applicationId: string,
  ): Promise<GetCrmApplicationActivitiesResponseDto> {
    const application =
      await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
        currentUserId,
        leadId,
        applicationId,
      );

    const activities = await this.db.applicationActivities.find({
      where: { applicationId: application.id },
      order: { createdAt: 'DESC' },
    });

    const actorUserIds = [
      ...new Set(
        activities
          .map((activity) => activity.actedByUserId)
          .filter((userId): userId is string => userId != null),
      ),
    ];

    const actorDisplayNamesByUserId =
      await this.loadActorDisplayNamesByUserIds(actorUserIds);

    return this.activityMapper.toGetCrmApplicationActivitiesResponse(
      application.id,
      activities,
      actorDisplayNamesByUserId,
    );
  }

  private async loadActorDisplayNamesByUserIds(
    userIds: string[],
  ): Promise<Map<string, string | null>> {
    const displayNamesByUserId = new Map<string, string | null>();

    if (userIds.length === 0) {
      return displayNamesByUserId;
    }

    const [consultantProfiles, leadProfiles] = await Promise.all([
      this.db.consultantProfiles.find({
        where: { userId: In(userIds) },
        select: ['userId', 'fullName'],
      }),
      this.db.leadProfiles.find({
        where: { userId: In(userIds) },
        select: ['userId', 'fullName'],
      }),
    ]);

    for (const profile of consultantProfiles) {
      displayNamesByUserId.set(profile.userId, profile.fullName);
    }

    for (const profile of leadProfiles) {
      if (!displayNamesByUserId.has(profile.userId)) {
        displayNamesByUserId.set(profile.userId, profile.fullName);
      }
    }

    return displayNamesByUserId;
  }
}
