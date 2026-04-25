import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import { LeadDocuments } from '@entity/entities/LeadDocuments.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { Applications } from '@entity/entities/Applications.entity';
import { SysApplicationStage } from '@entity/entities/SysApplicationStage.entity';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { GetApplicationDocumentProgressResponseDto } from '@shared/dtos/applications/GetApplicationDocumentProgressResponseDto';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { GetApplicationDetailsResponseDto } from '@shared/dtos/applications/GetApplicationDetailsResponseDto';
import { GetApplicationStageProgressResponseDto } from '@shared/dtos/applications/GetApplicationStageProgressResponseDto';
import { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';
import { ApplicationStageProgressState } from '@shared/enums/ApplicationStageProgressState.enum';
import { ApplicationDocumentSourceType } from '@shared/enums/ApplicationDocumentSourceType.enum';
import {
  ApplicationRequirementWithDocuments,
  DocumentProgressViewModel,
  StageProgressViewModel,
  UploadedDocumentView,
} from './helpers/application-read-model.types';
import { ApplicationAccessService } from './helpers/ApplicationAccessService';
import { ApplicationMapper } from './helpers/ApplicationMapper';
import { In } from 'typeorm';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';

@Injectable()
export class ApplicationQueryService {
  constructor(
    private readonly db: AppDbContext,
    private readonly applicationAccessService: ApplicationAccessService,
    private readonly mapper: ApplicationMapper,
  ) {}

  async getLeadApplications(
    currentUserId: string,
  ): Promise<GetApplicationsResponseDto> {
    const lead =
      await this.applicationAccessService.ensureLeadProfileExistsOrThrow(
        currentUserId,
      );

    const applications = await this.db.applications.find({
      where: { leadId: lead.id },
      relations: [
        'UniCourseIntake',
        'UniCourseIntake.UniCourse',
        'UniCourseIntake.UniCourse.SysUniversity',
        'CurrentSysApplicationStage',
        'CurrentSysApplicationStatus',
      ],
      order: { updatedAt: 'DESC' },
    });

    const items = applications.map((app) =>
      this.mapper.toApplicationListItem(app),
    );

    return this.mapper.toGetApplicationsResponse(items);
  }

  async getApplicationDetails(
    currentUserId: string,
    applicationId: string,
  ): Promise<GetApplicationDetailsResponseDto> {
    await this.applicationAccessService.ensureLeadCanAccessApplicationOrThrow(
      currentUserId,
      applicationId,
    );

    const application =
      await this.loadApplicationOverviewOrThrow(applicationId);

    const currentStageId = application.CurrentSysApplicationStage?.id;
    if (!currentStageId) {
      throw new NotFoundException('Current application stage not found');
    }

    const requirements = await this.loadCurrentStageRequirements(
      applicationId,
      currentStageId,
    );

    /** Load application-scoped documents */
    const applicationScopedRequirementIds = requirements
      .filter(
        (requirement) =>
          requirement.sourceType === ApplicationDocumentSourceType.Application,
      )
      .map((requirement) => requirement.id);

    const applicationDocuments =
      await this.loadApplicationDocumentsForRequirements(
        applicationId,
        applicationScopedRequirementIds,
      );

    /** Load lead-scoped documents */
    const leadScopedDocTypeIds = requirements
      .filter(
        (requirement) =>
          requirement.sourceType === ApplicationDocumentSourceType.Lead,
      )
      .map((requirement) => requirement.sysDocumentTypeId);

    const leadDocuments = await this.loadLeadDocumentsForRequirements(
      application.leadId,
      leadScopedDocTypeIds,
    );

    const applicationDocumentsByRequirementId =
      this.groupApplicationDocumentsByRequirementId(applicationDocuments);
    const leadDocumentsByDocTypeId =
      this.groupLeadDocumentsByDocTypeId(leadDocuments);

    const requirementsWithDocuments = this.buildRequirementWithUnifiedDocuments(
      requirements,
      applicationDocumentsByRequirementId,
      leadDocumentsByDocTypeId,
    );

    this.sortChecklistRowsForDetailsResponse(requirementsWithDocuments);

    return this.mapper.toGetApplicationDetailsResponse(
      application,
      requirementsWithDocuments,
    );
  }

  async getApplicationStageProgress(
    currentUserId: string,
    applicationId: string,
  ): Promise<GetApplicationStageProgressResponseDto> {
    await this.applicationAccessService.ensureLeadCanAccessApplicationOrThrow(
      currentUserId,
      applicationId,
    );

    const application =
      await this.loadApplicationCurrentStageOrThrow(applicationId);
    const stages = await this.loadOrderedStages();
    const viewModel = this.buildStageProgressViewModel(application, stages);

    return this.mapper.toStageProgressResponse(viewModel);
  }

  async getApplicationDocumentProgress(
    currentUserId: string,
    applicationId: string,
  ): Promise<GetApplicationDocumentProgressResponseDto> {
    await this.applicationAccessService.ensureLeadCanAccessApplicationOrThrow(
      currentUserId,
      applicationId,
    );

    const application =
      await this.loadApplicationCurrentStageOrThrow(applicationId);

    const currentStageId = application.CurrentSysApplicationStage?.id;
    if (!currentStageId) {
      throw new NotFoundException('Current application stage not found');
    }

    const requirements = await this.loadCurrentStageRequirements(
      applicationId,
      currentStageId,
    );

    const viewModel = this.buildDocumentProgressViewModel(requirements);

    return this.mapper.toDocumentProgressResponse(viewModel);
  }

  private async loadApplicationCurrentStageOrThrow(
    applicationId: string,
  ): Promise<Applications> {
    const application = await this.db.applications.findOne({
      where: { id: applicationId },
      relations: ['CurrentSysApplicationStage'],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  private async loadOrderedStages(): Promise<SysApplicationStage[]> {
    return this.db.applicationStages.find({
      order: { stageOrder: 'ASC' },
    });
  }

  private buildStageProgressViewModel(
    application: Applications,
    stages: SysApplicationStage[],
  ): StageProgressViewModel {
    const currentStage = application.CurrentSysApplicationStage;
    if (!currentStage) {
      throw new NotFoundException('Current application stage not found');
    }

    const currentStageOrder = currentStage.stageOrder;
    if (currentStageOrder == null) {
      throw new NotFoundException('Current application stage order not set');
    }

    const totalStages = stages.length;
    let completedStages = 0;
    const items: StageProgressViewModel['items'] = [];

    for (const stage of stages) {
      const order = stage.stageOrder;
      if (order == null) {
        throw new NotFoundException('Application stage order not set');
      }

      if (order < currentStageOrder) {
        completedStages += 1;
        items.push({ stage, state: ApplicationStageProgressState.Completed });
      } else if (order === currentStageOrder) {
        items.push({ stage, state: ApplicationStageProgressState.Current });
      } else {
        items.push({ stage, state: ApplicationStageProgressState.Upcoming });
      }
    }

    return {
      totalStages,
      completedStages,
      currentStage,
      items,
    };
  }

  private buildDocumentProgressViewModel(
    requirements: ApplicationRequiredDocuments[],
  ): DocumentProgressViewModel {
    let totalRequired = 0;
    let uploadedCount = 0;

    const items = requirements.map((requirement) => {
      const effectiveOverallStatus =
        requirement.overallStatus ?? ApplicationRequirementStatus.Pending;

      if (requirement.isRequired === true) {
        totalRequired += 1;
        if (
          effectiveOverallStatus === ApplicationRequirementStatus.InProgress ||
          effectiveOverallStatus === ApplicationRequirementStatus.Verified
        ) {
          uploadedCount += 1;
        }
      }

      return {
        requirement,
        order: requirement.displayOrder ?? Number.MAX_SAFE_INTEGER,
      };
    });

    this.sortDocumentProgressItems(items);

    return {
      totalRequired,
      uploadedCount,
      items,
    };
  }

  private sortDocumentProgressItems(
    items: DocumentProgressViewModel['items'],
  ): void {
    items.sort((a, b) => {
      const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      const nameA = a.requirement.SysDocumentType?.documentTypeName ?? '';
      const nameB = b.requirement.SysDocumentType?.documentTypeName ?? '';
      const nameCmp = nameA.localeCompare(nameB);
      if (nameCmp !== 0) {
        return nameCmp;
      }
      return a.requirement.id.localeCompare(b.requirement.id);
    });
  }

  /**
   * Deterministic checklist order: displayOrder ASC (nulls last), document type name ASC, requirement id ASC.
   */
  private sortChecklistRowsForDetailsResponse(
    rows: ApplicationRequirementWithDocuments[],
  ): void {
    rows.sort((a, b) => {
      const orderA = a.requirement.displayOrder ?? Number.MAX_SAFE_INTEGER;
      const orderB = b.requirement.displayOrder ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) {
        return orderA - orderB;
      }

      const nameA = a.requirement.SysDocumentType?.documentTypeName ?? '';
      const nameB = b.requirement.SysDocumentType?.documentTypeName ?? '';
      const nameCmp = nameA.localeCompare(nameB);
      if (nameCmp !== 0) {
        return nameCmp;
      }

      return a.requirement.id.localeCompare(b.requirement.id);
    });
  }

  private async loadApplicationOverviewOrThrow(
    applicationId: string,
  ): Promise<Applications> {
    const application = await this.db.applications.findOne({
      where: { id: applicationId },
      relations: [
        'UniCourseIntake',
        'UniCourseIntake.UniCourse',
        'UniCourseIntake.UniCourse.SysUniversity',
        'CurrentSysApplicationStage',
        'CurrentSysApplicationStatus',
        'AssignedToUser',
      ],
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  /**
   * Requirements for the application's current stage only — do not broaden reads across all stages.
   */
  private async loadCurrentStageRequirements(
    applicationId: string,
    currentStageId: string,
  ): Promise<ApplicationRequiredDocuments[]> {
    return this.db.applicationRequiredDocuments.find({
      where: {
        applicationId,
        sysApplicationStageId: currentStageId,
      },
      relations: ['SysApplicationStage', 'SysDocumentType'],
      order: {
        displayOrder: 'ASC',
      },
    });
  }

  private async loadApplicationDocumentsForRequirements(
    applicationId: string,
    requirementIds: string[],
  ): Promise<ApplicationDocuments[]> {
    if (requirementIds.length === 0) {
      return [];
    }
    return this.db.applicationDocuments.find({
      where: {
        applicationId,
        applicationRequirementId: In(requirementIds),
        overallStatus: In([
          ApplicationDocumentStatus.InProgress,
          ApplicationDocumentStatus.Verified,
        ]),
      },
      order: {
        updatedAt: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  private async loadLeadDocumentsForRequirements(
    leadId: string | undefined,
    sysDocumentTypeIds: string[],
  ): Promise<LeadDocuments[]> {
    if (!leadId || sysDocumentTypeIds.length === 0) {
      return [];
    }

    return this.db.leadDocuments.find({
      where: {
        leadId,
        sysDocumentTypeId: In(sysDocumentTypeIds),
        overallStatus: In([
          ApplicationDocumentStatus.InProgress,
          ApplicationDocumentStatus.Verified,
        ]),
      },
      order: {
        updatedAt: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  private groupApplicationDocumentsByRequirementId(
    documents: ApplicationDocuments[],
  ): Map<string, ApplicationDocuments[]> {
    const byRequirementId = new Map<string, ApplicationDocuments[]>();

    for (const document of documents) {
      const existing =
        byRequirementId.get(document.applicationRequirementId) ?? [];
      existing.push(document);
      byRequirementId.set(document.applicationRequirementId, existing);
    }

    return byRequirementId;
  }

  private groupLeadDocumentsByDocTypeId(
    documents: LeadDocuments[],
  ): Map<string, LeadDocuments[]> {
    const byDocTypeId = new Map<string, LeadDocuments[]>();

    for (const document of documents) {
      const existing = byDocTypeId.get(document.sysDocumentTypeId) ?? [];
      existing.push(document);
      byDocTypeId.set(document.sysDocumentTypeId, existing);
    }

    return byDocTypeId;
  }

  private buildRequirementWithUnifiedDocuments(
    requirements: ApplicationRequiredDocuments[],
    applicationDocumentsByRequirementId: Map<string, ApplicationDocuments[]>,
    leadDocumentsByDocTypeId: Map<string, LeadDocuments[]>,
  ): ApplicationRequirementWithDocuments[] {
    return requirements.map((requirement) => {
      let uploadedDocuments: UploadedDocumentView[];

      if (requirement.sourceType === ApplicationDocumentSourceType.Lead) {
        const leadDocsForType =
          leadDocumentsByDocTypeId.get(requirement.sysDocumentTypeId) ?? [];

        uploadedDocuments = leadDocsForType.map((document) => ({
          documentId: document.id,
          documentScope: 'LEAD' as const,
          fileName: document.latestFileName ?? null,
          overallStatus: document.overallStatus ?? null,
          createdAt: document.createdAt,
        }));
      } else {
        uploadedDocuments = (
          applicationDocumentsByRequirementId.get(requirement.id) ?? []
        ).map((document) => ({
          documentId: document.id,
          documentScope: 'APPLICATION' as const,
          fileName: document.latestFileName ?? null,
          overallStatus: document.overallStatus ?? null,
          createdAt: document.createdAt,
        }));
      }

      uploadedDocuments.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );

      return {
        requirement,
        uploadedDocuments,
      };
    });
  }
}
