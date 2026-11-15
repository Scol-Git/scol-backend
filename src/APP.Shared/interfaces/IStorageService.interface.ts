/**
 * Storage Service Interface
 *
 * Abstraction for object storage (e.g. Backblaze B2).
 * Used for presigned upload/download URLs; files do not pass through the API.
 */
export interface IStorageService {
  generateUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  generateDownloadUrl(key: string): Promise<string>;
  objectExists(key: string): Promise<boolean>;
  deleteObject(key: string): Promise<void>;
  /** Downloads an object as raw bytes. */
  getObjectBytes(key: string): Promise<Uint8Array>;
  /** Uploads an object (server-side). */
  putObject(key: string, body: Buffer, mimeType: string): Promise<void>;
  /** Object size in bytes, or null if the object does not exist. */
  getObjectSize(key: string): Promise<number | null>;
}
