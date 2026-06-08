import { Injectable, NotFoundException } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { PhoneNumberUtil } from '@shared/utils/PhoneNumberUtil';
import { ValidationException } from '@shared/exceptions/ValidationException';

@Injectable()
export class CrmLeadValidationService {
  constructor(private readonly db: AppDbContext) {}

  validatePhone(phone: string): void {
    PhoneNumberUtil.validate(phone);
  }

  async ensureLeadExistsOrThrow(leadId: string): Promise<void> {
    const lead = await this.db.leadProfiles.findOne({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
  }

  async ensureTargetCountryExistsOrThrow(
    targetCountryId?: string | null,
  ): Promise<void> {
    if (!targetCountryId) {
      return;
    }

    const country = await this.db.countries.findOne({
      where: { id: targetCountryId },
    });

    if (!country) {
      throw new NotFoundException('Target country not found');
    }
  }

  async ensureLeadPhoneMatchesOrThrow(
    leadId: string,
    phone: string,
  ): Promise<void> {
    const profile = await this.db.leadProfiles.findOne({
      where: { id: leadId },
      relations: { SysUser: true },
    });

    if (!profile?.SysUser) {
      throw new NotFoundException('Lead profile not found');
    }

    if (profile.SysUser.phone !== phone) {
      throw new ValidationException(
        'Phone number cannot be changed through this endpoint',
        { phone: ['Phone number does not match existing lead account'] },
        'PHONE_IMMUTABLE',
      );
    }
  }
}
