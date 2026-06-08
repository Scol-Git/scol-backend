import { Inject, Injectable } from '@nestjs/common';
import { LeadCreationService } from '@bll/services/leads/LeadCreationService';
import { IPasswordHasher } from '@shared/interfaces/security';
import { IPasswordHasher as IPasswordHasherToken } from '@shared/tokens/injection.tokens';
import { CreateCrmLeadRequestDto } from '@shared/dtos/crm/leads/CreateCrmLeadRequestDto';
import { CreateCrmLeadResponseDto } from '@shared/dtos/crm/leads/CreateCrmLeadResponseDto';
import { UpdateCrmLeadRequestDto } from '@shared/dtos/crm/leads/UpdateCrmLeadRequestDto';
import { UpdateCrmLeadResponseDto } from '@shared/dtos/crm/leads/UpdateCrmLeadResponseDto';
import { RegisterSource } from '@shared/enums/crm/RegisterSource.enum';
import { LeadStatus } from '@shared/enums/crm/LeadStatus.enum';
import { generateTemporaryPassword } from '@shared/utils/PasswordGeneratorUtil';
import { CrmLeadAccessService } from './helpers/CrmLeadAccessService';
import { CrmLeadValidationService } from './helpers/CrmLeadValidationService';

@Injectable()
export class CrmLeadService {
  constructor(
    private readonly accessService: CrmLeadAccessService,
    private readonly validationService: CrmLeadValidationService,
    private readonly leadCreationService: LeadCreationService,
    @Inject(IPasswordHasherToken) private readonly hasher: IPasswordHasher,
  ) {}

  async createLead(
    currentUserId: string,
    dto: CreateCrmLeadRequestDto,
  ): Promise<CreateCrmLeadResponseDto> {
    this.validationService.validatePhone(dto.phone);
    await this.validationService.ensureTargetCountryExistsOrThrow(
      dto.targetCountryId,
    );

    const consultantUserId =
      await this.accessService.ensureCrmCanAssignConsultantOrThrow(
        currentUserId,
        dto.consultantUserId,
      );

    const plainPassword = generateTemporaryPassword();
    const passwordHash = await this.hasher.hash(plainPassword);

    await this.leadCreationService.createLeadAccount({
      phone: dto.phone,
      passwordHash,
      fullName: dto.name,
      email: dto.email,
      address: dto.address,
      city: dto.city,
      gender: dto.gender,
      isPhoneVerified: true,
      crmInfo: {
        registerSource: dto.registerSource ?? RegisterSource.Offline,
        registerDate: new Date(),
        leadStatus: dto.leadStatus ?? LeadStatus.NewLead,
        targetSysCountryId: dto.targetCountryId ?? null,
        consultantUserId,
        hasPassedEnglishTest: dto.hasPassedEnglishTest ?? null,
      },
    });

    return {
      success: true,
      message: 'Lead created successfully',
      newLeadInfo: {
        phone: dto.phone,
        password: plainPassword,
      },
    };
  }

  async updateLead(
    currentUserId: string,
    leadId: string,
    dto: UpdateCrmLeadRequestDto,
  ): Promise<UpdateCrmLeadResponseDto> {
    await this.accessService.ensureCrmCanAccessLeadOrThrow(
      currentUserId,
      leadId,
    );

    await this.validationService.ensureLeadExistsOrThrow(leadId);

    if (dto.phone) {
      this.validationService.validatePhone(dto.phone ?? '');
    }
    await this.validationService.ensureTargetCountryExistsOrThrow(
      dto.targetCountryId,
    );

    let consultantUserId: string | null | undefined;

    if (dto.consultantUserId !== undefined) {
      consultantUserId =
        await this.accessService.ensureCrmCanAssignConsultantOrThrow(
          currentUserId,
          dto.consultantUserId,
        );
    }

    await this.leadCreationService.updateLeadAccount(leadId, {
      fullName: dto.name,
      email: dto.email,
      address: dto.address,
      city: dto.city,
      gender: dto.gender,
      ...(consultantUserId !== undefined
        ? { assignedToUserId: consultantUserId }
        : {}),
      crmInfo: {
        ...(dto.registerSource !== undefined
          ? { registerSource: dto.registerSource }
          : {}),
        ...(dto.leadStatus !== undefined ? { leadStatus: dto.leadStatus } : {}),
        ...(dto.targetCountryId !== undefined
          ? { targetSysCountryId: dto.targetCountryId }
          : {}),
        ...(consultantUserId !== undefined ? { consultantUserId } : {}),
        ...(dto.hasPassedEnglishTest !== undefined
          ? { hasPassedEnglishTest: dto.hasPassedEnglishTest }
          : {}),
        ...(dto.enrollmentStatus !== undefined
          ? { enrollmentStatus: dto.enrollmentStatus }
          : {}),
      },
    });

    return {
      success: true,
      message: 'Lead updated successfully',
    };
  }
}
