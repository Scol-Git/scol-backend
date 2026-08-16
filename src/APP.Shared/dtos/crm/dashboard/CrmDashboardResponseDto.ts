import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CrmDashboardLeadStatisticsDto {
  @ApiProperty({ example: 120 })
  totalLead!: number;

  @ApiProperty({ example: 40 })
  onlineLead!: number;

  @ApiProperty({ example: 50 })
  offlineLead!: number;

  @ApiProperty({ example: 30 })
  loggedInLead!: number;
}

export class CrmDashboardEnrollmentStatisticsDto {
  @ApiProperty({ example: 25 })
  totalEnrollment!: number;

  @ApiProperty({ example: 15 })
  onlineEnrollment!: number;

  @ApiProperty({ example: 10 })
  physicalEnrollment!: number;
}

export class CrmDashboardApplicationIntakeStatisticsDto {
  @ApiProperty({ example: 2026 })
  intakeYear!: number;

  @ApiProperty({ example: 1, description: 'Quarter bucket: 1=Jan-Mar, 2=Apr-Jun, 3=Jul-Sep, 4=Oct-Dec' })
  quarter!: number;

  @ApiProperty({ example: 10 })
  submitted!: number;

  @ApiProperty({ example: 5 })
  conditionalOffer!: number;

  @ApiProperty({ example: 4 })
  unconditionalOffer!: number;

  @ApiProperty({ example: 3 })
  interview!: number;

  @ApiProperty({ example: 2 })
  payment!: number;

  @ApiProperty({ example: 1 })
  casOrCoeOrI20!: number;

  @ApiProperty({ example: 1 })
  visa!: number;
}

export class CrmDashboardLeadStatusDistributionDto {
  @ApiProperty({ example: 30 })
  newLead!: number;

  @ApiProperty({ example: 40 })
  eligible!: number;

  @ApiProperty({ example: 10 })
  notEligible!: number;

  @ApiProperty({ example: 5 })
  unreachable!: number;

  @ApiProperty({ example: 15 })
  visited!: number;
}

export class CrmDashboardQuickOverviewDto {
  @ApiProperty({ example: 33.33, description: 'Percentage of leads marked eligible in the date range' })
  eligibleLeadRate!: number;

  @ApiProperty({ example: 50, description: 'Percentage of leads with hasAnyApplication=true in the date range' })
  applicationRate!: number;

  @ApiProperty({ example: 12.5, description: 'Percentage of leads with hasSuccessfulVisa=true in the date range' })
  visaRate!: number;

  @ApiProperty({ example: 20, description: 'Percentage of leads with enrollment status or date set in the date range' })
  enrollRate!: number;
}

export class CrmDashboardRecentLeadDto {
  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  email?: string;

  @ApiProperty({ example: '01837917991' })
  phone!: string;

  @ApiProperty({
    example: 'University of Toronto, McGill University',
    description: 'Comma-separated distinct universities from lead applications',
  })
  targetUniversity!: string;

  @ApiProperty({ example: 'Eligible' })
  status!: string;
}

export class CrmDashboardResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Dashboard data retrieved successfully' })
  message!: string;

  @ApiProperty({ type: CrmDashboardLeadStatisticsDto })
  leadStatistics!: CrmDashboardLeadStatisticsDto;

  @ApiProperty({ type: CrmDashboardEnrollmentStatisticsDto })
  enrollmentStatistics!: CrmDashboardEnrollmentStatisticsDto;

  @ApiProperty({ type: [CrmDashboardApplicationIntakeStatisticsDto] })
  applicationStatisticsByIntake!: CrmDashboardApplicationIntakeStatisticsDto[];

  @ApiProperty({ type: CrmDashboardLeadStatusDistributionDto })
  leadStatusDistribution!: CrmDashboardLeadStatusDistributionDto;

  @ApiProperty({ type: CrmDashboardQuickOverviewDto })
  quickOverview!: CrmDashboardQuickOverviewDto;

  @ApiProperty({ type: [CrmDashboardRecentLeadDto] })
  recentLeads!: CrmDashboardRecentLeadDto[];
}
