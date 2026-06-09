import { Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { SysUsers } from '@entity/entities/SysUsers.entity';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { LeadCrmInfos } from '@entity/entities/LeadCrmInfos.entity';
import { SysRoles } from '@entity/entities/SysRoles.entity';
import { AccountStatus } from '@shared/enums/AccountStatus.enum';
import { UserType } from '@shared/enums/UserType.enum';
import { Role } from '@shared/enums/Role.enum';
import { LeadStatus } from '@shared/enums/crm/LeadStatus.enum';
import { PhoneAlreadyExistsException } from '@shared/exceptions/auth/PhoneAlreadyExistsException';
import { EmailAlreadyExistsException } from '@shared/exceptions/auth/EmailAlreadyExistsException';
import { BusinessException } from '@shared/exceptions/BusinessException';
import {
  CreateLeadAccountInput,
  UpdateLeadAccountInput,
} from './interfaces/CreateLeadAccountInput.interface';

export interface CreateLeadAccountResult {
  user: SysUsers;
  profile: SysLeadProfiles;
  crmInfo: LeadCrmInfos;
}

@Injectable()
export class LeadCreationService {
  constructor(private readonly db: AppDbContext) {}

  async createLeadAccount(
    input: CreateLeadAccountInput,
  ): Promise<CreateLeadAccountResult> {
    await this.ensurePhoneAvailable(input.phone);
    if (input.email) {
      await this.ensureEmailAvailable(input.email);
    }

    return this.db.transaction(async (manager) =>
      this.createLeadAccountInTransaction(manager, input),
    );
  }

  async updateLeadAccount(
    leadId: string,
    input: UpdateLeadAccountInput,
  ): Promise<CreateLeadAccountResult> {
    return this.db.transaction(async (manager) => {
      const profileRepo = manager.getRepository(SysLeadProfiles);
      const crmInfoRepo = manager.getRepository(LeadCrmInfos);
      const userRepo = manager.getRepository(SysUsers);

      const profile = await profileRepo.findOne({
        where: { id: leadId },
      });

      if (!profile) {
        throw new NotFoundException('Lead profile not found');
      }

      const user = await userRepo.findOne({
        where: { id: profile.userId },
      });

      if (!user) {
        throw new NotFoundException('Lead user not found');
      }

      const crmInfo = await crmInfoRepo.findOne({
        where: { leadId: profile.id },
      });

      if (!crmInfo) {
        throw new NotFoundException('Lead CRM info not found');
      }

      const phone = input.phone;

      if (phone != null && phone !== user.phone) {
        await this.ensurePhoneAvailable(phone);
      }

      if (input.email != null && input.email !== user.email) {
        await this.ensureEmailAvailable(input.email);
      }

      if (phone != null) {
        user.phone = phone;
      }

      if (input.fullName != null) {
        profile.fullName = input.fullName;
      }

      if (input.email != null) {
        user.email = input.email;
      }

      if (input.address != null) {
        profile.address = input.address;
      }

      if (input.city != null) {
        profile.city = input.city;
      }

      if (input.gender != null) {
        profile.gender = input.gender;
      }

      if (input.crmInfo.registerSource != null) {
        crmInfo.registerSource = input.crmInfo.registerSource;
      }

      if (input.crmInfo.leadStatus != null) {
        crmInfo.leadStatus = input.crmInfo.leadStatus;
      }

      if (input.crmInfo.targetSysCountryId != null) {
        crmInfo.targetSysCountryId = input.crmInfo.targetSysCountryId;
      }

      if (input.crmInfo.consultantId != null) {
        profile.assignedConsultantId = input.crmInfo.consultantId;
        crmInfo.consultantId = input.crmInfo.consultantId;
      }

      if (input.crmInfo.hasPassedEnglishTest != null) {
        crmInfo.hasPassedEnglishTest = input.crmInfo.hasPassedEnglishTest;
      }

      if (input.crmInfo.enrollmentStatus != null) {
        crmInfo.enrollmentStatus = input.crmInfo.enrollmentStatus;
        if (input.crmInfo.enrollmentDate != null) {
          crmInfo.enrollmentDate = input.crmInfo.enrollmentDate;
        } else {
          crmInfo.enrollmentDate = new Date();
        }
      }

      await userRepo.save(user);
      const savedProfile = await profileRepo.save(profile);
      const savedCrmInfo = await crmInfoRepo.save(crmInfo);

      return {
        user,
        profile: savedProfile,
        crmInfo: savedCrmInfo,
      };
    });
  }

  private async createLeadAccountInTransaction(
    manager: EntityManager,
    input: CreateLeadAccountInput,
  ): Promise<CreateLeadAccountResult> {
    const userRepo = manager.getRepository(SysUsers);
    const profileRepo = manager.getRepository(SysLeadProfiles);
    const crmInfoRepo = manager.getRepository(LeadCrmInfos);
    const roleRepo = manager.getRepository(SysRoles);

    const leadRole = await roleRepo.findOne({
      where: { name: Role.LEAD },
    });

    if (!leadRole) {
      throw new BusinessException('Lead role not found', 'LEAD_ROLE_NOT_FOUND');
    }

    const newUser = userRepo.create({
      phone: input.phone,
      email: input.email ?? undefined,
      passwordHash: input.passwordHash,
      accountStatus: AccountStatus.Active,
      userType: UserType.Lead,
      isPhoneVerified: input.isPhoneVerified ?? false,
      failedLoginAttempts: 0,
      roles: [leadRole],
    });

    const savedUser = await userRepo.save(newUser);

    const profile = profileRepo.create({
      userId: savedUser.id,
      fullName: input.fullName,
      address: input.address ?? undefined,
      city: input.city ?? undefined,
      gender: input.gender ?? undefined,
      assignedConsultantId: input.crmInfo.consultantId ?? null,
    });

    const savedProfile = await profileRepo.save(profile);

    const crmInfo = crmInfoRepo.create({
      leadId: savedProfile.id,
      registerSource: input.crmInfo.registerSource,
      registerDate: input.crmInfo.registerDate,
      leadStatus: input.crmInfo.leadStatus ?? LeadStatus.NewLead,
      targetSysCountryId: input.crmInfo.targetSysCountryId ?? null,
      consultantId: input.crmInfo.consultantId ?? null,
      hasPassedEnglishTest: input.crmInfo.hasPassedEnglishTest ?? undefined,
      hasAnyApplication: false,
      hasSuccessfulVisa: false,
      enrollmentStatus: input.crmInfo.enrollmentStatus ?? undefined,
      enrollmentDate: input.crmInfo.enrollmentDate ?? undefined,
    });

    const savedCrmInfo = await crmInfoRepo.save(crmInfo);

    return {
      user: savedUser,
      profile: savedProfile,
      crmInfo: savedCrmInfo,
    };
  }

  private async ensurePhoneAvailable(phone: string): Promise<void> {
    const existingUser = await this.db.users.findOne({
      where: { phone },
    });

    if (existingUser) {
      throw new PhoneAlreadyExistsException(phone);
    }
  }

  private async ensureEmailAvailable(email: string): Promise<void> {
    const existingUser = await this.db.users.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new EmailAlreadyExistsException(email);
    }
  }
}
