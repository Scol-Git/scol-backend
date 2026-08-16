import { Injectable } from '@nestjs/common';
import { SysLeadProfiles } from '@entity/entities/SysLeadProfiles.entity';
import {
  CrmDashboardApplicationIntakeStatisticsDto,
  CrmDashboardEnrollmentStatisticsDto,
  CrmDashboardLeadStatisticsDto,
  CrmDashboardLeadStatusDistributionDto,
  CrmDashboardQuickOverviewDto,
  CrmDashboardRecentLeadDto,
} from '@shared/dtos/crm/dashboard/CrmDashboardResponseDto';
import {
  calculatePercentage,
  createEmptyIntakeStatistics,
  generateIntakeQuarterBuckets,
  getQuarterFromMonth,
  INTAKE_STAGE_TO_FIELD,
  IntakeQuarterBucket,
  toCount,
} from '../helpers/CrmDashboardHelper';
import {
  EnrollmentAggregateRow,
  IntakeStageAggregateRow,
  LeadAggregateRow,
  RecentLeadUniversityRow,
} from './crm-dashboard-query.types';

@Injectable()
export class CrmDashboardMapper {
  mapLeadStatistics(row: LeadAggregateRow): CrmDashboardLeadStatisticsDto {
    return {
      totalLead: toCount(row.totalLead),
      onlineLead: toCount(row.onlineLead),
      offlineLead: toCount(row.offlineLead),
      loggedInLead: toCount(row.loggedInLead),
    };
  }

  mapEnrollmentStatistics(
    row: EnrollmentAggregateRow,
  ): CrmDashboardEnrollmentStatisticsDto {
    return {
      totalEnrollment: toCount(row.totalEnrollment),
      onlineEnrollment: toCount(row.onlineEnrollment),
      physicalEnrollment: toCount(row.physicalEnrollment),
    };
  }

  mapLeadStatusDistribution(
    row: LeadAggregateRow,
  ): CrmDashboardLeadStatusDistributionDto {
    return {
      newLead: toCount(row.newLead),
      eligible: toCount(row.eligible),
      notEligible: toCount(row.notEligible),
      unreachable: toCount(row.unreachable),
      visited: toCount(row.visited),
    };
  }

  mapQuickOverview(row: LeadAggregateRow): CrmDashboardQuickOverviewDto {
    const totalLead = toCount(row.totalLead);

    return {
      eligibleLeadRate: calculatePercentage(toCount(row.eligibleCount), totalLead),
      applicationRate: calculatePercentage(
        toCount(row.applicationCount),
        totalLead,
      ),
      visaRate: calculatePercentage(toCount(row.visaCount), totalLead),
      enrollRate: calculatePercentage(toCount(row.enrolledCount), totalLead),
    };
  }

  mapIntakeStatistics(
    startDate: string,
    endDate: string,
    rows: IntakeStageAggregateRow[],
  ): CrmDashboardApplicationIntakeStatisticsDto[] {
    const buckets = generateIntakeQuarterBuckets(startDate, endDate);
    const bucketMap = new Map<string, CrmDashboardApplicationIntakeStatisticsDto>();

    for (const bucket of buckets) {
      bucketMap.set(this.getBucketKey(bucket), createEmptyIntakeStatistics(bucket));
    }

    for (const row of rows) {
      const quarter = getQuarterFromMonth(Number(row.intakeMonth));
      const bucketKey = `${Number(row.intakeYear)}:${quarter}`;
      const bucketStats = bucketMap.get(bucketKey);

      if (!bucketStats) {
        continue;
      }

      const field = INTAKE_STAGE_TO_FIELD[row.stageCode];
      if (!field) {
        continue;
      }

      bucketStats[field] += toCount(row.count);
    }

    return buckets.map((bucket) => bucketMap.get(this.getBucketKey(bucket))!);
  }

  mapRecentLeads(
    leads: SysLeadProfiles[],
    universityRows: RecentLeadUniversityRow[],
  ): CrmDashboardRecentLeadDto[] {
    const universitiesByLeadId = this.groupUniversitiesByLeadId(universityRows);

    return leads.map((lead) => {
      const crm = lead.LeadCrmInfo!;

      return {
        name: lead.fullName,
        email: lead.SysUser.email,
        phone: lead.SysUser.phone,
        targetUniversity: universitiesByLeadId.get(lead.id) ?? '',
        status: crm.leadStatus ?? '',
      };
    });
  }

  private groupUniversitiesByLeadId(
    rows: RecentLeadUniversityRow[],
  ): Map<string, string> {
    const grouped = new Map<string, Set<string>>();

    for (const row of rows) {
      if (!row.uniName) {
        continue;
      }

      const names = grouped.get(row.leadId) ?? new Set<string>();
      names.add(row.uniName);
      grouped.set(row.leadId, names);
    }

    const result = new Map<string, string>();

    for (const [leadId, names] of grouped.entries()) {
      result.set(leadId, Array.from(names).join(', '));
    }

    return result;
  }

  private getBucketKey(bucket: IntakeQuarterBucket): string {
    return `${bucket.intakeYear}:${bucket.quarter}`;
  }
}
