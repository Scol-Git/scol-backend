import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { In, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { ApplicationQueryService } from '@bll/services/applications/ApplicationQueryService';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { Applications } from '@entity/entities/Applications.entity';
import { GetCrmApplicationDetailsResponseDto } from '@shared/dtos/applications/GetCrmApplicationDetailsResponseDto';
import { GetApplicationDocumentProgressResponseDto } from '@shared/dtos/applications/GetApplicationDocumentProgressResponseDto';
import { GetApplicationStageProgressResponseDto } from '@shared/dtos/applications/GetApplicationStageProgressResponseDto';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { GetCrmApplicationActivitiesResponseDto } from '@shared/dtos/applications/GetCrmApplicationActivitiesResponseDto';
import { CrmApplicationDropdownDataResponseDto } from '@shared/dtos/crm/applications/CrmApplicationDropdownDataResponseDto';
import { CrmApplicationListRequestDto } from '@shared/dtos/crm/applications/CrmApplicationListRequestDto';
import {
  CrmApplicationListItemDto,
  CrmApplicationListResponseDto,
  CrmApplicationListStatisticsDto,
} from '@shared/dtos/crm/applications/CrmApplicationListResponseDto';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';
import { ApplicationStage } from '@shared/enums/ApplicationStage.enum';
import { ApplicationStatus } from '@shared/enums/ApplicationStatus.enum';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';
import { CrmApplicationActivityMapper } from './helpers/CrmApplicationActivityMapper';

interface CrmApplicationListCursor {
  createdAt: string;
  applicationId: string;
}

@Injectable()
export class CrmApplicationQueryService {
  constructor(
    private readonly db: AppDbContext,
    private readonly accessService: CrmApplicationAccessService,
    private readonly applicationQueryService: ApplicationQueryService,
    private readonly activityMapper: CrmApplicationActivityMapper,
  ) {}

  async getApplicationList(
    currentUserId: string,
    dto: CrmApplicationListRequestDto,
  ): Promise<CrmApplicationListResponseDto> {
    const [pageResult, statistics] = await Promise.all([
      this.fetchApplicationListPage(dto),
      this.fetchApplicationListStatistics(dto),
    ]);

    return {
      success: true,
      message: 'Application list fetched successfully',
      pagination: pageResult.pagination,
      statistics,
      applications: pageResult.applications,
    };
  }

  private async fetchApplicationListPage(dto: CrmApplicationListRequestDto): Promise<{
    applications: CrmApplicationListItemDto[];
    pagination: CrmApplicationListResponseDto['pagination'];
  }> {
    const qb = this.db.applications
      .createQueryBuilder('app')
      .innerJoinAndSelect('app.SysLeadProfile', 'lead')
      .innerJoinAndSelect('lead.SysUser', 'leadUser')
      .innerJoinAndSelect('app.UniCourseIntake', 'intake')
      .innerJoinAndSelect('intake.UniCourse', 'course')
      .innerJoinAndSelect('course.SysUniversity', 'uni')
      .innerJoinAndSelect('app.CurrentSysApplicationStatus', 'status')
      .innerJoinAndSelect('app.CurrentSysApplicationStage', 'stage')
      .leftJoinAndSelect('app.AssignedToConsultant', 'consultant');

    this.applyApplicationListFilters(qb, dto);

    const limit = dto.pagination?.limit ?? 15;
    const cursor = dto.pagination?.cursor
      ? this.decodeCursor(dto.pagination.cursor)
      : null;

    if (cursor) {
      qb.andWhere(
        `
          (
            "app"."createdAt" < :createdAt
          )
          OR
          (
            "app"."createdAt" = :createdAt
            AND "app"."id" < :applicationId
          )
        `,
        {
          createdAt: cursor.createdAt,
          applicationId: cursor.applicationId,
        },
      );
    }

    qb.orderBy('app.createdAt', 'DESC').addOrderBy('app.id', 'DESC');
    qb.take(limit + 1);

    const entities = await qb.getMany();
    const hasNext = entities.length > limit;
    const pageEntities = hasNext ? entities.slice(0, limit) : entities;

    const applications = pageEntities.map((x) => this.mapApplicationListItem(x));
    const lastItem = pageEntities[pageEntities.length - 1];

    return {
      applications,
      pagination: {
        cursor:
          lastItem && hasNext
            ? this.encodeCursor({
                createdAt: lastItem.createdAt.toISOString(),
                applicationId: lastItem.id,
              })
            : null,
        limit,
        hasNext,
      },
    };
  }

  private async fetchApplicationListStatistics(
    dto: CrmApplicationListRequestDto,
  ): Promise<CrmApplicationListStatisticsDto> {
    const submittedOrder = await this.resolveSubmittedStageOrder();

    const baseQb = this.db.applications.createQueryBuilder('app');
    this.applyApplicationListFilterJoins(baseQb);
    this.applyApplicationListFilters(baseQb, dto);

    const [
      totalApplications,
      applicationSubmitted,
      pendingDocuments,
      pendingReview,
    ] = await Promise.all([
      baseQb.getCount(),
      baseQb
        .clone()
        .andWhere('stage.stageOrder >= :submittedOrder', { submittedOrder })
        .getCount(),
      this.countPendingRequiredDocuments(dto),
      this.countPendingReviewDocuments(dto),
    ]);

    return {
      totalApplications,
      applicationSubmitted,
      pendingDocuments,
      pendingReview,
    };
  }

  private applyApplicationListFilterJoins(
    qb: SelectQueryBuilder<ObjectLiteral>,
  ): void {
    qb.innerJoin('app.SysLeadProfile', 'lead')
      .innerJoin('app.UniCourseIntake', 'intake')
      .innerJoin('intake.UniCourse', 'course')
      .innerJoin('course.SysUniversity', 'uni')
      .innerJoin('app.CurrentSysApplicationStatus', 'status')
      .innerJoin('app.CurrentSysApplicationStage', 'stage');
  }

  private applyApplicationListFilters(
    qb: SelectQueryBuilder<ObjectLiteral>,
    dto: CrmApplicationListRequestDto,
  ): void {
    if (dto.searchText) {
      qb.andWhere(
        `
          (
            lead.fullName ILIKE :search
            OR uni.uniName ILIKE :search
            OR course.courseName ILIKE :search
          )
        `,
        {
          search: `%${dto.searchText}%`,
        },
      );
    }

    const { filters, ranges } = dto;

    if (filters?.ApplicationStatuses?.length) {
      qb.andWhere('status.statusCode IN (:...statuses)', {
        statuses: filters.ApplicationStatuses,
      });
    }

    if (filters?.ApplicationStages?.length) {
      qb.andWhere('stage.stageCode IN (:...stages)', {
        stages: filters.ApplicationStages,
      });
    }

    if (filters?.consultantIds?.length) {
      qb.andWhere('app.assignedToConsultantId IN (:...ids)', {
        ids: filters.consultantIds,
      });
    }

    const defaultRange = this.getDefaultApplicationDateRange();
    const startDate =
      ranges?.dateRange?.startDate ?? defaultRange.startDate;
    const endDate = ranges?.dateRange?.endDate ?? defaultRange.endDate;

    qb.andWhere('"app"."createdAt" >= :startDate', { startDate });
    qb.andWhere('"app"."createdAt" <= :endDate', {
      endDate: this.toEndOfDay(endDate),
    });
  }

  private async countPendingRequiredDocuments(
    dto: CrmApplicationListRequestDto,
  ): Promise<number> {
    const qb = this.db.applicationRequiredDocuments
      .createQueryBuilder('req')
      .innerJoin('req.Application', 'app');

    this.applyApplicationListFilterJoins(qb);
    this.applyApplicationListFilters(qb, dto);

    qb.andWhere('req.isRequired = :isRequired', { isRequired: true });
    qb.andWhere(
      `NOT EXISTS (
        SELECT 1 FROM "ApplicationDocuments" doc
        WHERE doc."applicationRequirementId" = req.id
      )`,
    );

    return qb.getCount();
  }

  private async countPendingReviewDocuments(
    dto: CrmApplicationListRequestDto,
  ): Promise<number> {
    const qb = this.db.applicationDocuments
      .createQueryBuilder('doc')
      .innerJoin('doc.Application', 'app');

    this.applyApplicationListFilterJoins(qb);
    this.applyApplicationListFilters(qb, dto);

    qb.andWhere('doc.overallStatus = :status', {
      status: ApplicationDocumentStatus.Pending,
    });

    return qb.getCount();
  }

  private async resolveSubmittedStageOrder(): Promise<number> {
    const submittedStage = await this.db.applicationStages.findOne({
      where: { stageCode: ApplicationStage.Submitted },
      select: ['stageOrder'],
    });

    if (submittedStage?.stageOrder == null) {
      throw new InternalServerErrorException(
        'Submitted application stage is not configured',
      );
    }

    return submittedStage.stageOrder;
  }

  async getDropdownData(): Promise<CrmApplicationDropdownDataResponseDto> {
    const consultants = await this.db.consultantProfiles.find({
      where: {
        isPublished: true,
      },
      order: {
        sortOrder: 'ASC',
      },
    });

    return {
      consultantUsers: consultants.map((x) => ({
        userId: x.id,
        name: x.fullName,
      })),
      applicationStatuses: Object.values(ApplicationStatus),
      applicationStages: Object.values(ApplicationStage),
    };
  }

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

  private mapApplicationListItem(app: Applications): CrmApplicationListItemDto {
    const lead = app.SysLeadProfile!;
    const course = app.UniCourseIntake!.UniCourse!;
    const university = course.SysUniversity!;

    return {
      id: app.id,
      leadInfo: {
        leadId: app.leadId!,
        name: lead.fullName,
        email: lead.SysUser?.email,
        phone: lead.SysUser!.phone,
      },
      universityCourseInfo: {
        UniCourseId: course.id,
        Uniname: university.uniName,
        Coursename: course.courseName,
      },
      consultantInfo: app.AssignedToConsultant
        ? {
            userId: app.AssignedToConsultant.id,
            name: app.AssignedToConsultant.fullName,
          }
        : null,
      applicationDate: this.toIsoDateString(app.createdAt),
      applicationStatus: app.CurrentSysApplicationStatus!.statusCode,
      applicationStage: app.CurrentSysApplicationStage!.stageCode,
      lastupdateDate: this.toIsoDateString(app.updatedAt),
    };
  }

  private encodeCursor(data: CrmApplicationListCursor): string {
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  private decodeCursor(cursor: string): CrmApplicationListCursor | null {
    try {
      const json = Buffer.from(cursor, 'base64url').toString('utf-8');
      const parsed = JSON.parse(json) as Partial<CrmApplicationListCursor>;

      if (!parsed.createdAt || !parsed.applicationId) {
        return null;
      }

      return {
        createdAt: parsed.createdAt,
        applicationId: parsed.applicationId,
      };
    } catch {
      return null;
    }
  }

  private toIsoDateString(date: Date): string {
    return date instanceof Date
      ? date.toISOString().split('T')[0]
      : String(date);
  }

  private toEndOfDay(endDate: string): string {
    return `${endDate}T23:59:59.999Z`;
  }

  private getDefaultApplicationDateRange(): {
    startDate: string;
    endDate: string;
  } {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return {
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${day}`,
    };
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
