import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';
import { DocumentScope } from '@shared/enums/DocumentScope.enum';
import { LeadDocuments } from '@entity/entities/LeadDocuments.entity';

export interface CreateOrReuseApplicationScopedDocumentInput {
  applicationId: string;
  requirement: ApplicationRequiredDocuments;
  latestFileName: string;
  actedByUserId: string;
}

export interface CreateOrReuseLeadScopedDocumentInput {
  leadId: string;
  requirement: ApplicationRequiredDocuments;
  latestFileName: string;
  actedByUserId: string;
}

/**
 * Centralizes ApplicationDocuments row creation/reuse for application-scoped upload flow.
 */
@Injectable()
export class ApplicationDocumentLinker {
  async createOrReuseApplicationScopedDocument(
    manager: EntityManager,
    input: CreateOrReuseApplicationScopedDocumentInput,
  ): Promise<ApplicationDocuments> {
    const { applicationId, requirement, latestFileName, actedByUserId } = input;
    const repo = manager.getRepository(ApplicationDocuments);

    if (!requirement.isMultipleAllowed) {
      const existing = await repo.findOne({
        where: {
          applicationId,
          applicationRequirementId: requirement.id,
          isActive: true,
        },
      });
      if (existing) {
        existing.latestFileName = latestFileName;
        existing.updatedByUserId = actedByUserId;
        existing.overallStatus = ApplicationDocumentStatus.Pending;
        return repo.save(existing);
      }
    }

    const created = repo.create({
      applicationId,
      sysDocumentTypeId: requirement.sysDocumentTypeId,
      applicationRequirementId: requirement.id,
      latestFileName,
      overallStatus: ApplicationDocumentStatus.Pending,
      isActive: true,
      createdByUserId: actedByUserId,
      updatedByUserId: actedByUserId,
    });
    return repo.save(created);
  }

  async createOrReuseLeadScopedDocument(
    manager: EntityManager,
    input: CreateOrReuseLeadScopedDocumentInput,
  ): Promise<LeadDocuments> {
    const { leadId, requirement, latestFileName, actedByUserId } = input;
    const repo = manager.getRepository(LeadDocuments);

    if (!requirement.isMultipleAllowed) {
      const existing = await repo.findOne({
        where: {
          leadId,
          sysDocumentTypeId: requirement.sysDocumentTypeId,
        },
      });
      if (existing) {
        existing.latestFileName = latestFileName;
        existing.updatedByUserId = actedByUserId;
        existing.overallStatus = ApplicationDocumentStatus.Pending;
        return repo.save(existing);
      }
    }

    const created = repo.create({
      leadId,
      sysDocumentTypeId: requirement.sysDocumentTypeId,
      latestFileName,
      overallStatus: ApplicationDocumentStatus.Pending,
      createdByUserId: actedByUserId,
      updatedByUserId: actedByUserId,
    });
    return repo.save(created);
  }
}
