/**
 * Business status for ApplicationRequiredDocuments (document type / checklist row).
 * Stored as varchar in DB.
 */
export enum ApplicationRequirementStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Verified = 'VERIFIED',
}
