import type { UploadStatus } from '@shared/enums/UploadStatus.enum';

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

export type PendingUploadForConfirmation = {
  documentScope: PendingUploadVersionOwner;
  documentId: string;
  documentVersionId: string;
  storageKey: string;
  originalFileName: string;
  uploadStatus: UploadStatus | null | undefined;
};

export type DownloadableDocument = {
  documentScope: PendingUploadVersionOwner;
  documentId: string;
  documentVersionId: string;
  storageKey: string;
  fileName: string;
};
