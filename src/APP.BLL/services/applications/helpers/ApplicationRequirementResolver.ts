import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { SysStageRequiredDocuments } from '@entity/entities/SysStageRequiredDocuments.entity';
import { SysDocumentTypes } from '@entity/entities/SysDocumentTypes.entity';
import { ApplicationDocumentSourceType } from '@shared/enums/ApplicationDocumentSourceType.enum';
import { ApplicationRequirementOverallStatus } from '@shared/enums/ApplicationRequirementOverallStatus.enum';
import { DocumentScope } from '@shared/enums/DocumentScope.enum';

type SysStageRequiredDocumentWithType = SysStageRequiredDocuments & {
  SysDocumentType: SysDocumentTypes;
};

@Injectable()
export class ApplicationRequirementResolver {
  async generateSnapshotForApplication(
    manager: EntityManager,
    applicationId: string,
    sysCountryId: string,
  ): Promise<void> {
    const sysStageRequiredDocuments =
      await this.loadActiveSysStageRequiredDocuments(manager, sysCountryId);

    if (sysStageRequiredDocuments.length === 0) {
      return;
    }

    const applicationRequiredDocumentsRepository = manager.getRepository(
      ApplicationRequiredDocuments,
    );

    const applicationRequiredDocumentRows = sysStageRequiredDocuments.map(
      (sysStageRequiredDocument) =>
        this.buildApplicationRequiredDocumentRow(
          applicationId,
          sysStageRequiredDocument,
          sysStageRequiredDocument.SysDocumentType,
        ),
    );

    const applicationRequiredDocumentsEntities =
      applicationRequiredDocumentsRepository.create(
        applicationRequiredDocumentRows,
      );

    await applicationRequiredDocumentsRepository.save(
      applicationRequiredDocumentsEntities,
    );
  }

  private async loadActiveSysStageRequiredDocuments(
    manager: EntityManager,
    sysCountryId: string,
  ): Promise<SysStageRequiredDocumentWithType[]> {
    const sysStageRequiredDocumentsRepository = manager.getRepository(
      SysStageRequiredDocuments,
    );

    return (await sysStageRequiredDocumentsRepository.find({
      where: {
        sysCountryId,
        isActive: true,
      },
      relations: {
        SysDocumentType: true,
      },
      order: {
        displayOrder: 'ASC',
        sysApplicationStageId: 'ASC',
      },
    })) as SysStageRequiredDocumentWithType[];
  }

  private buildApplicationRequiredDocumentRow(
    applicationId: string,
    sysStageRequiredDocument: SysStageRequiredDocuments,
    sysDocumentType: SysDocumentTypes,
  ): Partial<ApplicationRequiredDocuments> {
    return {
      applicationId,
      sysApplicationStageId: sysStageRequiredDocument.sysApplicationStageId,
      sysDocumentTypeId: sysStageRequiredDocument.sysDocumentTypeId,
      sysStageRequiredDocumentId: sysStageRequiredDocument.id,

      isRequired: sysStageRequiredDocument.isRequired,
      minCount: sysStageRequiredDocument.minCount,
      maxCount: sysStageRequiredDocument.maxCount,
      displayOrder: sysStageRequiredDocument.displayOrder,

      isMultipleAllowed: sysDocumentType.isMultipleAllowed ?? false,
      allowedMimeTypes: sysDocumentType.allowedMimeTypes,
      maxFileSizeBytes: sysDocumentType.maxFileSizeBytes,

      sourceType: this.resolveApplicationDocumentSourceType(
        sysDocumentType.documentScope,
      ),
      overallStatus: ApplicationRequirementOverallStatus.Missing,
    };
  }

  private resolveApplicationDocumentSourceType(
    scope: DocumentScope,
  ): ApplicationDocumentSourceType {
    switch (scope) {
      case DocumentScope.Lead:
        return ApplicationDocumentSourceType.Lead;
      case DocumentScope.Application:
        return ApplicationDocumentSourceType.Application;
      default:
        return ApplicationDocumentSourceType.Manual;
    }
  }
}
