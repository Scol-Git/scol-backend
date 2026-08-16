export interface LeadAggregateRow {
  totalLead: string | number | null;
  onlineLead: string | number | null;
  offlineLead: string | number | null;
  loggedInLead: string | number | null;
  newLead: string | number | null;
  eligible: string | number | null;
  notEligible: string | number | null;
  unreachable: string | number | null;
  visited: string | number | null;
  eligibleCount: string | number | null;
  applicationCount: string | number | null;
  visaCount: string | number | null;
  enrolledCount: string | number | null;
}

export interface EnrollmentAggregateRow {
  totalEnrollment: string | number | null;
  onlineEnrollment: string | number | null;
  physicalEnrollment: string | number | null;
}

export interface IntakeStageAggregateRow {
  intakeYear: string | number;
  intakeMonth: string | number;
  stageCode: string;
  count: string | number;
}

export interface RecentLeadUniversityRow {
  leadId: string;
  uniName: string;
}

export const EMPTY_LEAD_AGGREGATE_ROW: LeadAggregateRow = {
  totalLead: 0,
  onlineLead: 0,
  offlineLead: 0,
  loggedInLead: 0,
  newLead: 0,
  eligible: 0,
  notEligible: 0,
  unreachable: 0,
  visited: 0,
  eligibleCount: 0,
  applicationCount: 0,
  visaCount: 0,
  enrolledCount: 0,
};

export const EMPTY_ENROLLMENT_AGGREGATE_ROW: EnrollmentAggregateRow = {
  totalEnrollment: 0,
  onlineEnrollment: 0,
  physicalEnrollment: 0,
};
