import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { IStorageService } from '@shared/interfaces/IStorageService.interface';

const UPLOAD_URL_EXPIRES_IN = 24 * 3600; // 24 hours
const DOWNLOAD_URL_EXPIRES_IN = 24 * 3600; // 24 hours

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

  async generateUploadUrl(key: string, mimeType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    });
    return getSignedUrl(this.client, command, {
      expiresIn: UPLOAD_URL_EXPIRES_IN,
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

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
