/**
 * Upload state of a document file version (persisted as varchar).
 *
 * Aligns with application/lead document version entities; values are stable for API and storage.
 */
export enum UploadStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  FAILED = 'FAILED',
}
