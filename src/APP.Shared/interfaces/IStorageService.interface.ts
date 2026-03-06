/**
 * Storage Service Interface
 *
 * Abstraction for object storage (e.g. Backblaze B2).
 * Used for presigned upload/download URLs; files do not pass through the API.
 */
export interface IStorageService {
  generateUploadUrl(key: string, mimeType: string): Promise<string>;
  generateDownloadUrl(key: string): Promise<string>;
  objectExists(key: string): Promise<boolean>;
  deleteObject(key: string): Promise<void>;
}
