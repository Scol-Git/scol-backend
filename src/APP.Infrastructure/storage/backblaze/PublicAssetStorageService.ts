import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const DEFAULT_UPLOAD_URL_EXPIRES_IN = 900;

export interface PublicAssetHead {
  contentType: string | null;
  size: number;
}

/**
 * Permanent public file URL for a Backblaze friendly download.
 * us-east-005 -> https://f005.backblazeb2.com/file/{bucket}/{key}
 */
export function publicAssetFileUrl(
  region: string,
  bucket: string,
  key: string,
  version: number,
): string {
  const digits = region.match(/(\d+)$/)?.[1] ?? '005';
  const path = key.split('/').map((part) => encodeURIComponent(part)).join('/');
  return `https://f${digits}.backblazeb2.com/file/${encodeURIComponent(bucket)}/${path}?v=${version}`;
}

/**
 * Presign and head objects in the public university-image bucket (scol-assets).
 * This client is separate from BackblazeStorageService, which is bound to the
 * private scol-documents bucket.
 *
 * Browser PUT needs the scolWebUpload CORS rule on this bucket (same origins
 * as scol-documents). Viewing the public file URL from an img tag does not.
 */
@Injectable()
export class PublicAssetStorageService {
  private readonly client: S3Client | null;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private readonly config: ConfigService) {
    const storage = this.config.get<{
      endpoint?: string;
      region?: string;
      publicKeyId?: string;
      publicApplicationKey?: string;
      publicBucketName?: string;
    }>('storage');

    this.bucket = storage?.publicBucketName?.trim() ?? '';
    this.region = storage?.region ?? 'us-east-005';
    const keyId = storage?.publicKeyId?.trim() ?? '';
    const applicationKey = storage?.publicApplicationKey?.trim() ?? '';
    const endpoint = storage?.endpoint;

    if (keyId && applicationKey && endpoint && this.bucket) {
      this.client = new S3Client({
        endpoint,
        region: this.region,
        credentials: { accessKeyId: keyId, secretAccessKey: applicationKey },
        forcePathStyle: true,
      });
    } else {
      this.client = null;
    }
  }

  async generateUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds: number = DEFAULT_UPLOAD_URL_EXPIRES_IN,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.requireBucket(),
      Key: key,
      ContentType: mimeType,
    });
    return getSignedUrl(this.requireClient(), command, { expiresIn: expiresInSeconds });
  }

  async head(key: string): Promise<PublicAssetHead | null> {
    try {
      const res = await this.requireClient().send(
        new HeadObjectCommand({ Bucket: this.requireBucket(), Key: key }),
      );
      return {
        contentType: res.ContentType ?? null,
        size: res.ContentLength ?? 0,
      };
    } catch (err: unknown) {
      const code = (err as { name?: string; $metadata?: { httpStatusCode?: number } });
      if (code?.name === 'NotFound' || code?.name === 'NoSuchKey' || code?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  fileUrl(key: string, version: number): string {
    return publicAssetFileUrl(this.region, this.requireBucket(), key, version);
  }

  private requireClient(): S3Client {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Public asset storage is not configured. Set B2_PUBLIC_KEY_ID, B2_PUBLIC_APPLICATION_KEY, and B2_PUBLIC_BUCKET_NAME.',
      );
    }
    return this.client;
  }

  private requireBucket(): string {
    if (!this.bucket) {
      throw new ServiceUnavailableException(
        'Public asset storage is not configured. Set B2_PUBLIC_BUCKET_NAME.',
      );
    }
    return this.bucket;
  }
}
