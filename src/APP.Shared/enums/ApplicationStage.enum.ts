/**
 * Workflow stage codes for application journey (varchar in DB).
 */
export enum ApplicationStage {
  Review = 'REVIEW',
  Submitted = 'SUBMITTED',
  Conditional = 'CONDITIONAL',
  Unconditional = 'UNCONDITIONAL',
  Interview = 'INTERVIEW',
  Payment = 'PAYMENT',
  CasCoe = 'CAS_COE',
  Visa = 'VISA',
  Enrolled = 'ENROLLED',
  CollectCommission = 'COLLECT_COMMISSION',
  Completed = 'COMPLETED',
}

