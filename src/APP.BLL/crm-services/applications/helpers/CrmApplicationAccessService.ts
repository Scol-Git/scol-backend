import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { Role } from '@shared/enums/Role.enum';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { Applications } from '@entity/entities/Applications.entity';

@Injectable()
export class CrmApplicationAccessService {
  constructor(private readonly db: AppDbContext) {}

  async ensureCrmCanAccessLeadOrThrow(
    currentUserId: string,
    leadId: string,
  ): Promise<SysLeadProfiles> {
    const crmUser = await this.loadCrmUserWithRolesOrThrow(currentUserId);

    const leadProfile = await this.loadLeadProfileByIdOrThrow(leadId);

    if (this.hasAnyRole(crmUser, [Role.SUPER_ADMIN, Role.ADMIN])) {
      return leadProfile;
    }

    // if (this.hasAnyRole(crmUser, [Role.COUNSELLOR])) {
    //   if (leadProfile.assignedConsultantId === crmUser.id) {
    //     return leadProfile;
    //   }
    // }

    throw new ForbiddenException('You are not authorized to access this lead');
  }

  async ensureCrmCanAccessApplicationForLeadOrThrow(
    currentUserId: string,
    leadId: string,
    applicationId: string,
  ): Promise<Applications> {
    await this.ensureCrmCanAccessLeadOrThrow(currentUserId, leadId);

    const application = await this.db.applications.findOne({
      where: {
        id: applicationId,
        leadId,
      },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    return application;
  }

  private async loadCrmUserWithRolesOrThrow(userId: string): Promise<SysUsers> {
    const user = await this.db.users.findOne({
      where: { id: userId },
      relations: {
        roles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async loadLeadProfileByIdOrThrow(
    leadId: string,
  ): Promise<SysLeadProfiles> {
    const leadProfile = await this.db.leadProfiles.findOne({
      where: { id: leadId },
    });
    if (!leadProfile) {
      throw new NotFoundException('Lead profile not found');
    }

    return leadProfile;
  }

  private hasAnyRole(user: SysUsers, allowedRoles: Role[]): boolean {
    const roles = user.roles ?? [];

    return roles.some((role) => allowedRoles.includes(role.name));
  }
}
