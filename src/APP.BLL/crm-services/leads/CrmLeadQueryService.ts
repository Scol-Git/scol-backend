import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import {
  CrmLeadListItemDto,
  CrmLeadListResponseDto,
} from '@shared/dtos/crm/leads/CrmLeadListResponseDto';
import { CrmLeadListRequestDto } from '@shared/dtos/crm/leads/CrmLeadListRequestDto';
import { CrmLeadDropdownDataResponseDto } from '@shared/dtos/crm/leads/CrmLeadDropdownDataResponseDto';
import { EnrollmentStatus } from '@shared/enums/crm/EnrollmentStatus.enum';
import { LeadStatus } from '@shared/enums/crm/LeadStatus.enum';
import { RegisterSource } from '@shared/enums/crm/RegisterSource.enum';
import { CrmLeadAccessService } from './helpers/CrmLeadAccessService';

interface CrmLeadListCursor {
  registerDate: string;
  leadId: string;
}

@Injectable()
export class CrmLeadQueryService {
  constructor(
    private readonly db: AppDbContext,
    private readonly accessService: CrmLeadAccessService,
  ) {}

  async getLeadList(
    currentUserId: string,
    dto: CrmLeadListRequestDto,
  ): Promise<CrmLeadListResponseDto> {
    //await this.accessService.ensureConsultantUserExistsOrThrow(currentUserId);

    const qb = this.db.leadProfiles
      .createQueryBuilder('lead')
      .innerJoinAndSelect('lead.SysUser', 'user')
      .innerJoinAndSelect('lead.LeadCrmInfo', 'crm')
      .leftJoinAndSelect('crm.TargetSysCountry', 'country')
      .leftJoinAndSelect('crm.ConsultantProfile', 'consultant');

    // if (crmUser.roles.some((x) => x.name === Role.COUNSELLOR)) {
    //   qb.andWhere('lead.assignedConsultantId = :consultantId', {
    //     consultantId: crmUser.id,
    //   });
    // }

    if (dto.searchText) {
      qb.andWhere(
        `
          (
            lead.fullName ILIKE :search
            OR user.phone ILIKE :search
            OR user.email ILIKE :search
          )
        `,
        {
          search: `%${dto.searchText}%`,
        },
      );
    }

    const { filters, ranges } = dto;

    if (filters?.targetCountryIds?.length) {
      qb.andWhere('crm.targetSysCountryId IN (:...ids)', {
        ids: filters.targetCountryIds,
      });
    }

    if (filters?.consultantIds?.length) {
      qb.andWhere('crm.consultantId IN (:...ids)', {
        ids: filters.consultantIds,
      });
    }

    if (filters?.leadStatuses?.length) {
      qb.andWhere('crm.leadStatus IN (:...statuses)', {
        statuses: filters.leadStatuses,
      });
    }

    if (filters?.registerSources?.length) {
      qb.andWhere('crm.registerSource IN (:...sources)', {
        sources: filters.registerSources,
      });
    }

    if (filters?.enrollmentStatuses?.length) {
      qb.andWhere('crm.enrollmentStatus IN (:...statuses)', {
        statuses: filters.enrollmentStatuses,
      });
    }

    const defaultRange = this.getDefaultRegisterDateRange();
    const startDate = ranges?.startDate ?? defaultRange.startDate;
    const endDate = ranges?.endDate ?? defaultRange.endDate;

    qb.andWhere('crm.registerDate >= :startDate', { startDate });
    qb.andWhere('crm.registerDate <= :endDate', { endDate });

    if (dto.flags?.hasPassedEnglishTest !== undefined) {
      qb.andWhere('crm.hasPassedEnglishTest = :value', {
        value: dto.flags.hasPassedEnglishTest,
      });
    }

    const limit = dto.pagination?.limit ?? 15;
    const cursor = dto.pagination?.cursor
      ? this.decodeCursor(dto.pagination.cursor)
      : null;

    if (cursor) {
      qb.andWhere(
        `
          (
            crm.registerDate < :registerDate
          )
          OR
          (
            crm.registerDate = :registerDate
            AND lead.id < :leadId
          )
        `,
        {
          registerDate: cursor.registerDate,
          leadId: cursor.leadId,
        },
      );
    }

    qb.orderBy('crm.registerDate', 'DESC').addOrderBy('lead.id', 'DESC');
    qb.take(limit + 1);

    const entities = await qb.getMany();
    const hasNext = entities.length > limit;
    const pageEntities = hasNext ? entities.slice(0, limit) : entities;

    const leads = pageEntities.map((x) => this.mapLeadListItem(x));
    const lastItem = pageEntities[pageEntities.length - 1];

    return {
      success: true,
      message: 'Leads retrieved successfully',
      pagination: {
        cursor:
          lastItem && hasNext
            ? this.encodeCursor({
                registerDate: this.toIsoDateString(
                  lastItem.LeadCrmInfo!.registerDate,
                ),
                leadId: lastItem.id,
              })
            : null,
        limit,
        hasNext,
      },
      leads,
    };
  }

  async getDropdownData(): Promise<CrmLeadDropdownDataResponseDto> {
    const [countries, consultants] = await Promise.all([
      this.db.countries.find(),
      this.db.consultantProfiles.find({
        where: {
          isPublished: true,
        },
        order: {
          sortOrder: 'ASC',
        },
      }),
    ]);

    return {
      targetCountries: countries.map((x) => ({
        countryId: x.id,
        countryName: x.countryName,
      })),
      consultantUsers: consultants.map((x) => ({
        consultantId: x.id,
        name: x.fullName,
      })),
      registerSources: Object.values(RegisterSource),
      leadStatuses: Object.values(LeadStatus),
      enrollmentStatuses: Object.values(EnrollmentStatus),
    };
  }

  private mapLeadListItem(x: SysLeadProfiles): CrmLeadListItemDto {
    const crm = x.LeadCrmInfo!;

    return {
      id: x.id,
      name: x.fullName,
      phone: x.SysUser.phone,
      email: x.SysUser.email,
      leadStatus: crm.leadStatus!,
      consultantInfo: crm.ConsultantProfile
        ? {
            consultantId: crm.ConsultantProfile.id,
            name: crm.ConsultantProfile.fullName,
          }
        : null,
      targetCountryInfo: crm.TargetSysCountry
        ? {
            countryId: crm.TargetSysCountry.id,
            name: crm.TargetSysCountry.countryName,
          }
        : null,
      registerSource: crm.registerSource!,
      registerDate: crm.registerDate,
      enrollmentStatus: crm.enrollmentStatus ?? null,
      enrollmentDate: crm.enrollmentDate ?? null,
      hasPassedEnglishTest: crm.hasPassedEnglishTest ?? null,
    };
  }

  private encodeCursor(data: CrmLeadListCursor): string {
    return Buffer.from(JSON.stringify(data)).toString('base64url');
  }

  private decodeCursor(cursor: string): CrmLeadListCursor | null {
    try {
      const json = Buffer.from(cursor, 'base64url').toString('utf-8');
      const parsed = JSON.parse(json) as Partial<CrmLeadListCursor>;

      if (!parsed.registerDate || !parsed.leadId) {
        return null;
      }

      return {
        registerDate: parsed.registerDate,
        leadId: parsed.leadId,
      };
    } catch {
      return null;
    }
  }

  private toIsoDateString(date: Date): string {
    return date instanceof Date
      ? date.toISOString().split('T')[0]
      : String(date);
  }

  private getDefaultRegisterDateRange(): { startDate: string; endDate: string } {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return {
      startDate: `${year}-${month}-01`,
      endDate: `${year}-${month}-${day}`,
    };
  }
}
