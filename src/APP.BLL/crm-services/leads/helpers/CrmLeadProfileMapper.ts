import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import { ApplicationListItemDto } from '@shared/dtos/applications/ApplicationListItemDto';
import { CrmLeadPersonalInformationDto } from '@shared/dtos/crm/leads/CrmLeadPersonalInformationDto';
import { CrmLeadTargetUniversityDto } from '@shared/dtos/crm/leads/CrmLeadTargetUniversityDto';
import { LeadProfileMapper } from '@bll/services/leads/LeadProfileMapper';

export class CrmLeadProfileMapper {
  static toPersonalInformation(
    profile: SysLeadProfiles,
    targetUniversities: CrmLeadTargetUniversityDto[],
  ): CrmLeadPersonalInformationDto {
    return {
      leadId: profile.id,
      fullName: profile.fullName,
      phoneNumber: profile.SysUser?.phone ?? null,
      email: profile.SysUser?.email ?? null,
      address: this.parseNullableString(profile.address),
      dateOfBirth: profile.dob ? this.formatDate(profile.dob) : null,
      leadStatus: profile.LeadCrmInfo?.leadStatus ?? null,
      targetUniversities,
      joined: profile.createdAt?.getFullYear()?.toString() ?? null,
      imageUrl: profile.imgUrl ?? null,
    };
  }

  static toTargetUniversities(
    applicationJourney: ApplicationListItemDto[],
  ): CrmLeadTargetUniversityDto[] {
    const unique = new Map<string, CrmLeadTargetUniversityDto>();

    for (const item of applicationJourney) {
      const university = item.applicationOverview?.universityInfo;
      if (!university?.universityId || unique.has(university.universityId)) {
        continue;
      }

      unique.set(university.universityId, {
        universityId: university.universityId,
        universityName: university.universityName,
      });
    }

    return [...unique.values()];
  }

  static toSharedDocuments(profile: SysLeadProfiles) {
    return {
      items: LeadProfileMapper.buildAcademicRecords(profile.LeadDocuments),
    };
  }

  private static parseNullableString(
    value: string | null | undefined,
  ): string | null {
    if (value == null || String(value).trim() === '') return null;
    return value;
  }

  private static formatDate(date: Date | string): string {
    if (typeof date === 'string') return date.split('T')[0];
    return (date instanceof Date ? date : new Date(date))
      .toISOString()
      .split('T')[0];
  }
}
