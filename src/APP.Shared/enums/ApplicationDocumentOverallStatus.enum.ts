/**
 * High-level status of an application document requirement / file slot (varchar in DB).
 */
export enum ApplicationDocumentOverallStatus {
  Missing = 'MISSING',
  PendingUpload = 'PENDING_UPLOAD',
  Uploaded = 'UPLOADED',
  Satisfied = 'SATISFIED',
  Rejected = 'REJECTED',
  Waived = 'WAIVED',
}
