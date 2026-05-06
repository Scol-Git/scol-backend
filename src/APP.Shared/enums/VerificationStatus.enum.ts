/**
 * Verification outcome for a document version or lead document header (persisted as varchar).
 */
export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}
