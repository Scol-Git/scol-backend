/**
 * High-level status of an ApplicationDocuments row (file slot / document instance).
 * For checklist rows use ApplicationRequirementOverallStatus on ApplicationRequiredDocuments.
 * Stored as varchar in DB.
 */
export enum ApplicationDocumentOverallStatus {
  Missing = 'MISSING',
  PendingUpload = 'PENDING_UPLOAD',
  Uploaded = 'UPLOADED',
  Satisfied = 'SATISFIED',
  Rejected = 'REJECTED',
  Waived = 'WAIVED',
}
