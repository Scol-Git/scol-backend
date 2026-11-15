export enum BulkImportStatus {
  AWAITING_UPLOAD = 'AWAITING_UPLOAD',
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  IN_REVIEW = 'IN_REVIEW',
  NO_CHANGES = 'NO_CHANGES',
  FAILED = 'FAILED',
  PUBLISHED = 'PUBLISHED',
  DISCARDED = 'DISCARDED',
}

/** Statuses after which polling can stop. */
export const BULK_IMPORT_FINAL_STATUSES: readonly BulkImportStatus[] = [
  BulkImportStatus.IN_REVIEW,
  BulkImportStatus.NO_CHANGES,
  BulkImportStatus.FAILED,
  BulkImportStatus.PUBLISHED,
  BulkImportStatus.DISCARDED,
];
