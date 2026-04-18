import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { Applications } from '@entity/entities/Applications.entity';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { GetApplicationsResponseDto } from '@shared/dtos/applications/GetApplicationsResponseDto';
import { GetApplicationDetailsResponseDto } from '@shared/dtos/applications/GetApplicationDetailsResponseDto';
import { ApplicationRequirementWithDocuments } from './helpers/application-read-model.types';
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
