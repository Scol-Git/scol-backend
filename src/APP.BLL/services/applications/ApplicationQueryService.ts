import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { Applications } from '@entity/entities/Applications.entity';
import { SysApplicationStage } from '@entity/entities/SysApplicationStage.entity';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { GetApplicationDocumentProgressResponseDto } from '@shared/dtos/applications/GetApplicationDocumentProgressResponseDto';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { GetApplicationDetailsResponseDto } from '@shared/dtos/applications/GetApplicationDetailsResponseDto';
import { GetApplicationStageProgressResponseDto } from '@shared/dtos/applications/GetApplicationStageProgressResponseDto';
import { ApplicationRequirementOverallStatus } from '@shared/enums/ApplicationRequirementOverallStatus.enum';
import { ApplicationStageProgressState } from '@shared/enums/ApplicationStageProgressState.enum';
import {
  ApplicationRequirementWithDocuments,
  DocumentProgressViewModel,
  StageProgressViewModel,
} from './helpers/application-read-model.types';
import { ApplicationAccessService } from './helpers/ApplicationAccessService';
import { ApplicationMapper } from './helpers/ApplicationMapper';
import { In } from 'typeorm';

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

    const requirementIds = requirements.map((requirement) => requirement.id);

    const documents = await this.loadActiveApplicationDocumentsForRequirements(
      applicationId,
      requirementIds,
    );

    const documentsByRequirementId =
      this.groupDocumentsByRequirementId(documents);

    const requirementsWithDocuments = this.buildRequirementWithDocuments(
      requirements,
      documentsByRequirementId,
    );

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

    for (const requirement of requirements) {
      if (requirement.isRequired === true) {
        totalRequired += 1;
        if (
          requirement.overallStatus !==
          ApplicationRequirementOverallStatus.Missing
        ) {
          uploadedCount += 1;
        }
      }
    }

    const items = requirements.map((requirement) => ({
      requirement,
      order: requirement.displayOrder ?? 0,
    }));

    return {
      totalRequired,
      uploadedCount,
      items,
    };
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

  private async loadActiveApplicationDocumentsForRequirements(
    applicationId: string,
    requirementIds: string[],
  ): Promise<ApplicationDocuments[]> {
    if (requirementIds.length === 0) {
      return [];
    }
    return this.db.applicationDocuments.find({
      where: {
        applicationId,
        isActive: true,
        applicationRequirementId: In(requirementIds),
      },
      order: {
        updatedAt: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  private groupDocumentsByRequirementId(
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

  private buildRequirementWithDocuments(
    requirements: ApplicationRequiredDocuments[],
    documentsByRequirementId: Map<string, ApplicationDocuments[]>,
  ): ApplicationRequirementWithDocuments[] {
    return requirements.map((requirement) => {
      const uploadedDocuments =
        documentsByRequirementId.get(requirement.id)?.slice() ?? [];

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
