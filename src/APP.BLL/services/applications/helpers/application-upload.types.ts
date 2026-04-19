/**
 * Internal only: which table owns documentVersionId for pending uploads.
 * Used by confirm-upload / download to resolve the version row without ambiguity.
 */
export type PendingUploadVersionOwner = 'APPLICATION' | 'LEAD';

export interface PendingUploadInitializationResult {
  applicationDocumentId: string;
  documentVersionId: string;
  documentVersionOwner: PendingUploadVersionOwner;
  storageKey: string;
  mimeType: string;
}
