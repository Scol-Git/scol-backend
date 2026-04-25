/**
 * Internal only: which table owns documentVersionId for pending uploads.
 * Used by confirm-upload / download to resolve the version row without ambiguity.
 */
export type PendingUploadVersionOwner = 'APPLICATION' | 'LEAD';

export interface PendingUploadInitializationResult {
  documentId: string;
  documentScope: PendingUploadVersionOwner;
  documentVersionId: string;
  storageKey: string;
  mimeType: string;
}
