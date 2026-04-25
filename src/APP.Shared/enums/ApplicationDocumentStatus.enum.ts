/**
 * Business status for ApplicationDocuments (specific document instance).
 * Stored as varchar in DB.
 */
export enum ApplicationDocumentStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Rejected = 'REJECTED',
  Verified = 'VERIFIED',
}
