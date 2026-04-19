/**
 * Lifecycle of a lead-scoped document aggregate (varchar in DB).
 * Distinct from ApplicationDocumentOverallStatus on ApplicationDocuments.
 */
export enum LeadDocumentOverallStatus {
  Missing = 'MISSING',
  PendingUpload = 'PENDING_UPLOAD',
  Uploaded = 'UPLOADED',
  Verified = 'VERIFIED',
  Rejected = 'REJECTED',
  Archived = 'ARCHIVED',
  Replaced = 'REPLACED',
}
