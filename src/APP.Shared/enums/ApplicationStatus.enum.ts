/**
 * Workflow status codes for application journey (varchar in DB).
 */
export enum ApplicationStatus {
  InProgress = 'IN_PROGRESS',
  Pending = 'PENDING',
  OnHold = 'ON_HOLD',
  Completed = 'COMPLETED',
  Rejected = 'REJECTED',
  Cancelled = 'CANCELLED',
}

