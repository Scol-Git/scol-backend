import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { LeadCrmInfos } from '@entity/entities/LeadCrmInfos.entity';
import { EnrollmentStatus } from '@shared/enums/crm/EnrollmentStatus.enum';

@Injectable()
export class LeadCrmInfoSyncService {
  async markHasApplication(
    manager: EntityManager,
    leadId: string,
  ): Promise<void> {
    const crmInfoRepo = manager.getRepository(LeadCrmInfos);
    const crmInfo = await crmInfoRepo.findOne({
      where: { leadId },
    });

    if (!crmInfo) {
      throw new NotFoundException('Lead CRM info not found');
    }

    if (crmInfo.hasAnyApplication === true) {
      return;
    }

    crmInfo.hasAnyApplication = true;
    await crmInfoRepo.save(crmInfo);
  }

  async syncEnrollmentOnFirstEnrolledStage(
    manager: EntityManager,
    leadId: string,
    enrolledAt: Date = new Date(),
  ): Promise<void> {
    const crmInfoRepo = manager.getRepository(LeadCrmInfos);
    const crmInfo = await crmInfoRepo.findOne({
      where: { leadId },
    });

    if (!crmInfo) {
      throw new NotFoundException('Lead CRM info not found');
    }

    let changed = false;

    if (crmInfo.enrollmentDate == null) {
      crmInfo.enrollmentDate = enrolledAt;
      changed = true;
    }

    if (crmInfo.enrollmentStatus == null) {
      crmInfo.enrollmentStatus = EnrollmentStatus.Online;
      changed = true;
    }

    if (changed) {
      await crmInfoRepo.save(crmInfo);
    }
  }
}
