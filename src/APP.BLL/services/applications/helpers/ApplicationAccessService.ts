import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { Applications } from '@entity/entities/Applications.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { SysUsers } from '@entity/entities/SysUsers.entity';

@Injectable()
export class ApplicationAccessService {
  constructor(private readonly db: AppDbContext) {}

  async ensureLeadProfileExistsOrThrow(
    userId: string,
  ): Promise<SysLeadProfiles> {
    const leadProfile = await this.db.leadProfiles.findOne({
      where: { userId },
    });

    if (!leadProfile) {
      throw new NotFoundException('Lead profile not found');
    }

    return leadProfile;
  }

  async ensureLeadCanAccessApplicationOrThrow(
    currentUserId: string,
    applicationId: string,
  ): Promise<Applications> {
    const lead = await this.ensureLeadProfileExistsOrThrow(currentUserId);

    const application = await this.db.applications.findOne({
      where: { id: applicationId },
    });

    if (!application || application.leadId !== lead.id) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  async ensureUserExistsOrThrow(userId: string): Promise<SysUsers> {
    const user = await this.db.users.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
