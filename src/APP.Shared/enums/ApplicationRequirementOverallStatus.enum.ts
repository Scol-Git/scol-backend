/**
 * Overall status of a row in ApplicationRequiredDocuments (checklist / requirement).
 * Stored as varchar in DB.
 */
export enum ApplicationRequirementOverallStatus {
  Missing = 'MISSING',
  PendingUpload = 'PENDING_UPLOAD',
  Uploaded = 'UPLOADED',
  Satisfied = 'SATISFIED',
  Rejected = 'REJECTED',
  Waived = 'WAIVED',
}
