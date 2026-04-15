import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
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
