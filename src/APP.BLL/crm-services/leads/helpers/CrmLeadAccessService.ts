import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { Role } from '@shared/enums/Role.enum';

@Injectable()
export class CrmLeadAccessService {
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

    if (
      this.hasAnyRole(crmUser, [Role.COUNSELLOR]) &&
      leadProfile.assignedConsultantId === crmUser.id
    ) {
      return leadProfile;
    }

    throw new ForbiddenException('You are not authorized to access this lead');
  }

  async ensureCrmCanAssignConsultantOrThrow(
    currentUserId: string,
    consultantId?: string | null,
  ): Promise<string | null> {
    const crmUser = await this.loadCrmUserWithRolesOrThrow(currentUserId);

    if (!this.hasAnyRole(crmUser, [Role.SUPER_ADMIN, Role.ADMIN])) {
      throw new ForbiddenException('You are not authorized to manage leads');
    }

    if (!consultantId) {
      return null;
    }

    await this.ensureConsultantExistsOrThrow(consultantId);
    return consultantId;

    // if (this.hasAnyRole(crmUser, [Role.COUNSELLOR])) {
    //   if (consultantUserId && consultantUserId !== crmUser.id) {
    //     throw new ForbiddenException(
    //       'Counsellors can only assign leads to themselves',
    //     );
    //   }

    //   return crmUser.id;
    // }
  }

  private async ensureConsultantExistsOrThrow(
    consultantId: string,
  ): Promise<void> {
    const consultant = await this.db.consultantProfiles.findOne({
      where: {
        id: consultantId,
        isPublished: true,
      },
      relations: { SysUser: { roles: true } },
    });

    if (!consultant) {
      throw new NotFoundException('Consultant user not found');
    }

    if (!this.hasAnyRole(consultant.SysUser, [Role.ADMIN, Role.COUNSELLOR])) {
      throw new ForbiddenException('Consultant user is not authorized');
    }
  }

  private async loadCrmUserWithRolesOrThrow(userId: string): Promise<SysUsers> {
    const user = await this.db.users.findOne({
      where: { id: userId },
      relations: { roles: true },
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
