import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ApplicationDocumentVersions } from '@entity/entities/ApplicationDocumentVersions.entity';
import { LeadDocumentVersions } from '@entity/entities/LeadDocumentVersions.entity';

@Injectable()
export class ApplicationDocumentVersionSequencer {
  async nextApplicationDocumentVersionNumber(
    manager: EntityManager,
    applicationDocumentId: string,
  ): Promise<number> {
    const repo = manager.getRepository(ApplicationDocumentVersions);

    const row = await repo.findOne({
      where: { applicationDocumentId },
      order: { versionNumber: 'DESC' },
    });

    const maxVersionNumber = Number(row?.versionNumber ?? 0);
    return maxVersionNumber + 1;
  }

  async nextLeadDocumentVersionNumber(
    manager: EntityManager,
    leadDocumentId: string,
  ): Promise<number> {
    const repo = manager.getRepository(LeadDocumentVersions);
    const row = await repo.findOne({
      where: { leadDocumentId },
      order: { versionNumber: 'DESC' },
    });

    const maxVersionNumber = Number(row?.versionNumber ?? 0);
    return maxVersionNumber + 1;
  }
}
