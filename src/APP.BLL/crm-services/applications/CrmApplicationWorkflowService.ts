import { Injectable, NotFoundException } from '@nestjs/common';
import { ApplicationActivityService } from '@bll/services/applications/helpers/ApplicationActivityService';
import { Applications } from '@entity/entities/Applications.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { SysApplicationStage } from '@entity/entities/SysApplicationStage.entity';
import { SysApplicationStage2Status } from '@entity/entities/SysApplicationStage2Status.entity';
import { SysApplicationStatus } from '@entity/entities/SysApplicationStatus.entity';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ApplicationStageSnapshotDto } from '@shared/dtos/applications/ApplicationStageSnapshotDto';
import { ApplicationStatusSnapshotDto } from '@shared/dtos/applications/ApplicationStatusSnapshotDto';
import { ChangeCrmApplicationStageRequestDto } from '@shared/dtos/applications/ChangeCrmApplicationStageRequestDto';
import { ChangeCrmApplicationStageResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationStageResponseDto';
import { ChangeCrmApplicationStatusRequestDto } from '@shared/dtos/applications/ChangeCrmApplicationStatusRequestDto';
import { ChangeCrmApplicationStatusResponseDto } from '@shared/dtos/applications/ChangeCrmApplicationStatusResponseDto';
import { ApplicationStage } from '@shared/enums/ApplicationStage.enum';
import { ApplicationStatus } from '@shared/enums/ApplicationStatus.enum';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { EntityManager } from 'typeorm';
import { CrmApplicationAccessService } from './helpers/CrmApplicationAccessService';
import { CrmApplicationWorkflowPolicy } from './helpers/CrmApplicationWorkflowPolicy';

@Injectable()
export class CrmApplicationWorkflowService {
  constructor(
    private readonly db: AppDbContext,
    private readonly accessService: CrmApplicationAccessService,
    private readonly applicationActivityService: ApplicationActivityService,
    private readonly workflowPolicy: CrmApplicationWorkflowPolicy,
  ) {}

  // #region changeApplicationStatus
  async changeApplicationStatus(
    currentUserId: string,
    leadId: string,
    applicationId: string,
    dto: ChangeCrmApplicationStatusRequestDto,
  ): Promise<ChangeCrmApplicationStatusResponseDto> {
    await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
      currentUserId,
      leadId,
      applicationId,
    );

    return this.db.transaction(async (manager) => {
      const application = await this.loadApplicationWithStageAndStatusOrThrow(
        manager,
        applicationId,
        leadId,
      );

      const targetStatus = await manager
        .getRepository(SysApplicationStatus)
        .findOne({
          where: {
            statusCode: dto.toStatus,
          },
        });

      if (!targetStatus) {
        throw new NotFoundException('Application status not found');
      }

      const previousStatus = application.CurrentSysApplicationStatus;
      const currentStage = application.CurrentSysApplicationStage;

      if (!previousStatus || !currentStage) {
        throw new NotFoundException('Application not found');
      }

      if (previousStatus.id === targetStatus.id) {
        const snap = this.toStatusSnapshot(targetStatus);
        return {
          success: true,
          currentStatus: snap,
          previousStatus: snap,
        };
      }

      await this.ensureStatusAllowedForStageOrThrow(
        manager,
        application.currentSysApplicationStageId,
        targetStatus.id,
      );

      this.workflowPolicy.validateStatusChangeOrThrow({
        fromStatus: previousStatus,
        toStatus: targetStatus,
        currentStage,
        remarks: dto.remarks,
      });

      application.currentSysApplicationStatusId = targetStatus.id;
      application.CurrentSysApplicationStatus = targetStatus;
      application.updatedAt = new Date();
      await manager.getRepository(Applications).save(application);

      await this.applicationActivityService.logApplicationStatusChanged(
        manager,
        {
          applicationId: application.id,
          actedByUserId: currentUserId,
          fromStatusId: previousStatus.id,
          toStatusId: targetStatus.id,
          fromStatusCode: previousStatus.statusCode,
          toStatusCode: targetStatus.statusCode,
          remarks: dto.remarks,
        },
      );

      return {
        success: true,
        currentStatus: this.toStatusSnapshot(targetStatus),
        previousStatus: this.toStatusSnapshot(previousStatus),
      };
    });
  }
  // #endregion

  // #region changeApplicationStage
  async changeApplicationStage(
    currentUserId: string,
    leadId: string,
    applicationId: string,
    dto: ChangeCrmApplicationStageRequestDto,
  ): Promise<ChangeCrmApplicationStageResponseDto> {
    await this.accessService.ensureCrmCanAccessApplicationForLeadOrThrow(
      currentUserId,
      leadId,
      applicationId,
    );

    return this.db.transaction(async (manager) => {
      const application = await this.loadApplicationWithStageAndStatusOrThrow(
        manager,
        applicationId,
        leadId,
      );

      const targetStage = await manager
        .getRepository(SysApplicationStage)
        .findOne({
          where: {
            stageCode: dto.toStage,
          },
        });

      if (!targetStage) {
        throw new NotFoundException('Application stage not found');
      }

      const previousStage = application.CurrentSysApplicationStage;
      const previousStatus = application.CurrentSysApplicationStatus;

      if (!previousStage || !previousStatus) {
        throw new NotFoundException('Application not found');
      }

      if (previousStage.id === targetStage.id) {
        const snap = this.toStageSnapshot(targetStage);

        return {
          success: true,
          currentStage: snap,
          previousStage: snap,
        };
      }

      this.workflowPolicy.validateStageChangeOrThrow({
        fromStage: previousStage,
        toStage: targetStage,
        remarks: dto.remarks,
      });

      const targetStatus = await this.resolveStatusForStageChangeOrThrow(
        manager,
        targetStage.id,
        previousStatus,
      );

      application.currentSysApplicationStageId = targetStage.id;
      application.CurrentSysApplicationStage = targetStage;
      application.currentSysApplicationStatusId = targetStatus.id;
      application.CurrentSysApplicationStatus = targetStatus;
      application.updatedAt = new Date();

      if (
        this.isSameCode(targetStage.stageCode, ApplicationStage.Submitted) &&
        application.submittedAt == null
      ) {
        application.submittedAt = new Date();
      }

      await manager.getRepository(Applications).save(application);

      await this.applicationActivityService.logApplicationStageChanged(
        manager,
        {
          applicationId: application.id,
          actedByUserId: currentUserId,
          fromStageId: previousStage.id,
          toStageId: targetStage.id,
          fromStageCode: previousStage.stageCode,
          toStageCode: targetStage.stageCode,
          fromStatusId: previousStatus.id,
          toStatusId: targetStatus.id,
          fromStatusCode: previousStatus.statusCode,
          toStatusCode: targetStatus.statusCode,
          remarks: dto.remarks,
        },
      );

      return {
        success: true,
        currentStage: this.toStageSnapshot(targetStage),
        previousStage: this.toStageSnapshot(previousStage),
      };
    });
  }
  // #endregion

  private async loadApplicationWithStageAndStatusOrThrow(
    manager: EntityManager,
    applicationId: string,
    leadId: string,
  ): Promise<Applications> {
    const application = await manager.getRepository(Applications).findOne({
      where: { id: applicationId, leadId },
      relations: {
        CurrentSysApplicationStage: true,
        CurrentSysApplicationStatus: true,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  // #region Private methods : changeApplicationStatus

  private async ensureStatusAllowedForStageOrThrow(
    manager: EntityManager,
    stageId: string,
    statusId: string,
  ): Promise<void> {
    const mapping = await manager
      .getRepository(SysApplicationStage2Status)
      .findOne({
        where: {
          sysApplicationStageId: stageId,
          sysApplicationStatusId: statusId,
        },
      });

    if (!mapping) {
      throw new ValidationException(
        'Status is not allowed for the current application stage',
        {
          toStatus: [
            'Status is not configured for the current application stage',
          ],
        },
      );
    }
  }
  // #endregion

  // #region Private methods : stage status resolution
  private async resolveStatusForStageChangeOrThrow(
    manager: EntityManager,
    targetStageId: string,
    currentStatus: SysApplicationStatus,
  ): Promise<SysApplicationStatus> {
    const allowedStatuses = await this.loadConfiguredStatusesForStageOrThrow(
      manager,
      targetStageId,
    );

    if (this.isStatusAllowedForStage(currentStatus, allowedStatuses)) {
      return currentStatus;
    }

    return this.resolveFallbackStatusForStage(allowedStatuses);
  }

  private async loadConfiguredStatusesForStageOrThrow(
    manager: EntityManager,
    stageId: string,
  ): Promise<SysApplicationStatus[]> {
    const mappings = await manager
      .getRepository(SysApplicationStage2Status)
      .find({
        where: {
          sysApplicationStageId: stageId,
        },
        relations: {
          SysApplicationStatus: true,
        },
        order: {
          SysApplicationStatus: {
            statusOrder: 'ASC',
          },
        },
      });

    const statuses = mappings
      .map((mapping) => mapping.SysApplicationStatus)
      .filter((status): status is SysApplicationStatus => Boolean(status));

    if (statuses.length === 0) {
      throw new ValidationException(
        'No application status is configured for the target stage',
      );
    }

    return statuses;
  }

  private isStatusAllowedForStage(
    status: SysApplicationStatus,
    allowedStatuses: SysApplicationStatus[],
  ): boolean {
    return allowedStatuses.some(
      (allowedStatus) => allowedStatus.id === status.id,
    );
  }

  private resolveFallbackStatusForStage(
    allowedStatuses: SysApplicationStatus[],
  ): SysApplicationStatus {
    //fallback to ApplicationStatus.InProgress
    const inProgressStatus = allowedStatuses.find((status) =>
      this.isSameCode(status.statusCode, ApplicationStatus.InProgress),
    );

    if (inProgressStatus) {
      return inProgressStatus;
    }

    //pick first configured status
    return allowedStatuses[0];
  }
  // #endregion

  private normalizeCode(value?: string | null): string {
    return (value ?? '').trim().toUpperCase();
  }

  private isSameCode(
    value: string | null | undefined,
    expected: string,
  ): boolean {
    return this.normalizeCode(value) === this.normalizeCode(expected);
  }

  private toStatusSnapshot(
    status: SysApplicationStatus,
  ): ApplicationStatusSnapshotDto {
    return {
      statusId: status.id,
      statusCode: status.statusCode,
      statusName: status.statusName ?? null,
    };
  }

  private toStageSnapshot(
    stage: SysApplicationStage,
  ): ApplicationStageSnapshotDto {
    return {
      stageId: stage.id,
      stageCode: stage.stageCode,
      stageName: stage.stageName ?? null,
    };
  }
}
