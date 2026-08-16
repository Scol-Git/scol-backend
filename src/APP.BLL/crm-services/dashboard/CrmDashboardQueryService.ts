import { Injectable } from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { CrmLeadAccessService } from '@bll/crm-services/leads/helpers/CrmLeadAccessService';
import { CrmDashboardQueryDto } from '@shared/dtos/crm/dashboard/CrmDashboardQueryDto';
import { CrmDashboardResponseDto, CrmDashboardRecentLeadDto } from '@shared/dtos/crm/dashboard/CrmDashboardResponseDto';
import { EnrollmentStatus } from '@shared/enums/crm/EnrollmentStatus.enum';
import { LeadStatus } from '@shared/enums/crm/LeadStatus.enum';
import { RegisterSource } from '@shared/enums/crm/RegisterSource.enum';
import { ValidationException } from '@shared/exceptions/ValidationException';
import { getIntakeKeyRange, resolveDashboardDateRange } from './helpers/CrmDashboardHelper';
import { CrmDashboardMapper } from './mappers/CrmDashboardMapper';
import {
  EMPTY_ENROLLMENT_AGGREGATE_ROW,
  EMPTY_LEAD_AGGREGATE_ROW,
  EnrollmentAggregateRow,
  IntakeStageAggregateRow,
  LeadAggregateRow,
  RecentLeadUniversityRow,
} from './mappers/crm-dashboard-query.types';

@Injectable()
export class CrmDashboardQueryService {
  constructor(
    private readonly db: AppDbContext,
    private readonly accessService: CrmLeadAccessService,
    private readonly mapper: CrmDashboardMapper,
  ) {}

  async getDashboard(
    currentUserId: string,
    query: CrmDashboardQueryDto,
  ): Promise<CrmDashboardResponseDto> {
    //await this.accessService.ensureConsultantUserExistsOrThrow(currentUserId);

    const { startDate, endDate } = this.resolveDateRangeOrThrow(
      query.startDate,
      query.endDate,
    );
    const recentLeadLimit = query.recentLeadLimit ?? 5;

    const [
      leadAggregates,
      enrollmentAggregates,
      intakeStageAggregates,
      recentLeads,
    ] = await Promise.all([
      this.fetchLeadAggregates(startDate, endDate),
      this.fetchEnrollmentAggregates(startDate, endDate),
      this.fetchIntakeStageAggregates(startDate, endDate),
      this.fetchRecentLeads(recentLeadLimit),
    ]);

    return {
      success: true,
      message: 'Dashboard data retrieved successfully',
      leadStatistics: this.mapper.mapLeadStatistics(leadAggregates),
      enrollmentStatistics: this.mapper.mapEnrollmentStatistics(
        enrollmentAggregates,
      ),
      applicationStatisticsByIntake: this.mapper.mapIntakeStatistics(
        startDate,
        endDate,
        intakeStageAggregates,
      ),
      leadStatusDistribution: this.mapper.mapLeadStatusDistribution(
        leadAggregates,
      ),
      quickOverview: this.mapper.mapQuickOverview(leadAggregates),
      recentLeads,
    };
  }

  private resolveDateRangeOrThrow(
    startDate?: string,
    endDate?: string,
  ): { startDate: string; endDate: string } {
    try {
      return resolveDashboardDateRange(startDate, endDate);
    } catch {
      throw new ValidationException('startDate must be on or before endDate');
    }
  }

  private async fetchLeadAggregates(
    startDate: string,
    endDate: string,
  ): Promise<LeadAggregateRow> {
    const qb = this.db.leadCrmInfos
      .createQueryBuilder('crm')
      .select('COUNT(*)', 'totalLead')
      .addSelect(
        'SUM(CASE WHEN crm.registerSource = :onlineSource THEN 1 ELSE 0 END)',
        'onlineLead',
      )
      .addSelect(
        'SUM(CASE WHEN crm.registerSource = :offlineSource THEN 1 ELSE 0 END)',
        'offlineLead',
      )
      .addSelect(
        'SUM(CASE WHEN crm.registerSource = :loggedInSource THEN 1 ELSE 0 END)',
        'loggedInLead',
      )
      .addSelect(
        'SUM(CASE WHEN crm.leadStatus = :newLeadStatus THEN 1 ELSE 0 END)',
        'newLead',
      )
      .addSelect(
        'SUM(CASE WHEN crm.leadStatus = :eligibleStatus THEN 1 ELSE 0 END)',
        'eligible',
      )
      .addSelect(
        'SUM(CASE WHEN crm.leadStatus = :notEligibleStatus THEN 1 ELSE 0 END)',
        'notEligible',
      )
      .addSelect(
        'SUM(CASE WHEN crm.leadStatus = :unreachableStatus THEN 1 ELSE 0 END)',
        'unreachable',
      )
      .addSelect(
        'SUM(CASE WHEN crm.leadStatus = :visitedStatus THEN 1 ELSE 0 END)',
        'visited',
      )
      .addSelect(
        'SUM(CASE WHEN crm.leadStatus = :eligibleStatus THEN 1 ELSE 0 END)',
        'eligibleCount',
      )
      .addSelect(
        'SUM(CASE WHEN crm.hasAnyApplication = true THEN 1 ELSE 0 END)',
        'applicationCount',
      )
      .addSelect(
        'SUM(CASE WHEN crm.hasSuccessfulVisa = true THEN 1 ELSE 0 END)',
        'visaCount',
      )
      .addSelect(
        `
          SUM(
            CASE
              WHEN crm.enrollmentStatus IS NOT NULL OR crm.enrollmentDate IS NOT NULL
              THEN 1
              ELSE 0
            END
          )
        `,
        'enrolledCount',
      )
      .where('crm.registerDate >= :startDate', { startDate })
      .andWhere('crm.registerDate <= :endDate', { endDate })
      .setParameters({
        onlineSource: RegisterSource.Online,
        offlineSource: RegisterSource.Offline,
        loggedInSource: RegisterSource.LoggedIn,
        newLeadStatus: LeadStatus.NewLead,
        eligibleStatus: LeadStatus.Eligible,
        notEligibleStatus: LeadStatus.NotEligible,
        unreachableStatus: LeadStatus.Unreachable,
        visitedStatus: LeadStatus.Visited,
      });

    const row = await qb.getRawOne<LeadAggregateRow>();

    return row ?? EMPTY_LEAD_AGGREGATE_ROW;
  }

  private async fetchEnrollmentAggregates(
    startDate: string,
    endDate: string,
  ): Promise<EnrollmentAggregateRow> {
    const qb = this.db.leadCrmInfos
      .createQueryBuilder('crm')
      .select('COUNT(*)', 'totalEnrollment')
      .addSelect(
        'SUM(CASE WHEN crm.enrollmentStatus = :onlineEnrollment THEN 1 ELSE 0 END)',
        'onlineEnrollment',
      )
      .addSelect(
        'SUM(CASE WHEN crm.enrollmentStatus = :physicalEnrollment THEN 1 ELSE 0 END)',
        'physicalEnrollment',
      )
      .where('crm.enrollmentDate IS NOT NULL')
      .andWhere('crm.enrollmentDate >= :startDate', { startDate })
      .andWhere('crm.enrollmentDate <= :endDate', { endDate })
      .setParameters({
        onlineEnrollment: EnrollmentStatus.Online,
        physicalEnrollment: EnrollmentStatus.Offline,
      });

    const row = await qb.getRawOne<EnrollmentAggregateRow>();

    return row ?? EMPTY_ENROLLMENT_AGGREGATE_ROW;
  }

  private async fetchIntakeStageAggregates(
    startDate: string,
    endDate: string,
  ): Promise<IntakeStageAggregateRow[]> {
    const { startKey, endKey } = getIntakeKeyRange(startDate, endDate);

    return this.db.applications
      .createQueryBuilder('app')
      .innerJoin('app.UniCourseIntake', 'intake')
      .innerJoin('app.CurrentSysApplicationStage', 'stage')
      .select('intake.intakeYear', 'intakeYear')
      .addSelect('intake.intakeMonth', 'intakeMonth')
      .addSelect('stage.stageCode', 'stageCode')
      .addSelect('COUNT(*)', 'count')
      .where('intake.intakeKey >= :startKey', { startKey })
      .andWhere('intake.intakeKey <= :endKey', { endKey })
      .groupBy('intake.intakeYear')
      .addGroupBy('intake.intakeMonth')
      .addGroupBy('stage.stageCode')
      .getRawMany<IntakeStageAggregateRow>();
  }

  private async fetchRecentLeads(limit: number): Promise<CrmDashboardRecentLeadDto[]> {
    const leads = await this.db.leadProfiles
      .createQueryBuilder('lead')
      .innerJoinAndSelect('lead.SysUser', 'user')
      .innerJoinAndSelect('lead.LeadCrmInfo', 'crm')
      .orderBy('crm.registerDate', 'DESC')
      .addOrderBy('lead.id', 'DESC')
      .take(limit)
      .getMany();

    if (!leads.length) {
      return [];
    }

    const leadIds = leads.map((lead) => lead.id);
    const universityRows = await this.db.applications
      .createQueryBuilder('app')
      .innerJoin('app.UniCourseIntake', 'intake')
      .innerJoin('intake.UniCourse', 'course')
      .innerJoin('course.SysUniversity', 'uni')
      .select('app.leadId', 'leadId')
      .addSelect('uni.uniName', 'uniName')
      .where('app.leadId IN (:...leadIds)', { leadIds })
      .orderBy('uni.uniName', 'ASC')
      .getRawMany<RecentLeadUniversityRow>();

    return this.mapper.mapRecentLeads(leads, universityRows);
  }
}
