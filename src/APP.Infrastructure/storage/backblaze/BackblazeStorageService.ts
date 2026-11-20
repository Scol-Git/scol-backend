import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
  ListObjectVersionsCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { IStorageService } from '@shared/interfaces/IStorageService.interface';


const DEFAULT_UPLOAD_URL_EXPIRES_IN = 3600; // 1 hour
const DOWNLOAD_URL_EXPIRES_IN = 3600; // 1 hour

@Injectable()
export class BackblazeStorageService implements IStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const storage = this.config.get<{
      keyId?: string;
      applicationKey?: string;
      bucketName?: string;
      endpoint?: string;
      region?: string;
    }>('storage');

    this.client = new S3Client({
      endpoint: storage?.endpoint,
      region: storage?.region ?? 'us-west-002',
      credentials: {
        accessKeyId: storage?.keyId ?? '',
        secretAccessKey: storage?.applicationKey ?? '',
      },
      forcePathStyle: true,
    });
    this.bucket = storage?.bucketName ?? '';
  }

  async generateUploadUrl(
    key: string,
    mimeType: string,
    expiresInSeconds: number = DEFAULT_UPLOAD_URL_EXPIRES_IN,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: expiresInSeconds,
    });
  }

  async generateDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: DOWNLOAD_URL_EXPIRES_IN,
    });
  }

  async objectExists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err: unknown) {
      const code = (err as { name?: string })?.name;
      if (code === 'NotFound' || code === 'NoSuchKey') {
        return false;
      }
      throw err;
    }
  }

  async getObjectBytes(key: string): Promise<Uint8Array> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    if (!res.Body) throw new Error(`Empty object body for ${key}`);
    return res.Body.transformToByteArray();
  }

  async putObject(key: string, body: Buffer, mimeType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mimeType,
      }),
    );
  }

  async getObjectSize(key: string): Promise<number | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return res.ContentLength ?? 0;
    } catch (err: unknown) {
      const code = (err as { name?: string })?.name;
      if (code === 'NotFound' || code === 'NoSuchKey') {
        return null;
      }
      throw err;
    }
  }

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async deleteAllVersions(key: string): Promise<void> {
    let keyMarker: string | undefined;
    let versionIdMarker: string | undefined;
    do {
      const page = await this.client.send(
        new ListObjectVersionsCommand({
          Bucket: this.bucket,
          Prefix: key,
          KeyMarker: keyMarker,
          VersionIdMarker: versionIdMarker,
        }),
      );
      // Prefix also matches longer keys (e.g. "a.csv" vs "a.csv.bak"); only delete the exact key.
      const versions = [...(page.Versions ?? []), ...(page.DeleteMarkers ?? [])].filter(
        (v) => v.Key === key && v.VersionId,
      );
      for (const v of versions) {
        await this.client.send(
          new DeleteObjectCommand({ Bucket: this.bucket, Key: key, VersionId: v.VersionId }),
        );
      }
      keyMarker = page.IsTruncated ? page.NextKeyMarker : undefined;
      versionIdMarker = page.IsTruncated ? page.NextVersionIdMarker : undefined;
    } while (keyMarker);
  }
}
