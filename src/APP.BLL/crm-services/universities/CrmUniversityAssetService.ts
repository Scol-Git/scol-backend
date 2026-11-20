import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { PublicAssetStorageService } from '@infra/storage/backblaze/PublicAssetStorageService';
import { UniAssetKind } from '@shared/enums/crm/UniAssetKind.enum';
import {
  UNI_ASSET_MAX_BYTES,
  UNI_ASSET_MIME_TYPES,
  type GenerateUniAssetUploadUrlRequestDto,
} from '@shared/dtos/crm/universities/GenerateUniAssetUploadUrlRequestDto';
import type { GenerateUniAssetUploadUrlResponseDto } from '@shared/dtos/crm/universities/GenerateUniAssetUploadUrlResponseDto';
import type { ConfirmUniAssetUploadRequestDto } from '@shared/dtos/crm/universities/ConfirmUniAssetUploadRequestDto';
import type { ConfirmUniAssetUploadResponseDto } from '@shared/dtos/crm/universities/ConfirmUniAssetUploadResponseDto';
import { CrmUniversityLookupService } from './helpers/CrmUniversityLookupService';

const ALLOWED_MIME = new Set<string>(UNI_ASSET_MIME_TYPES);

@Injectable()
export class CrmUniversityAssetService {
  private readonly uploadUrlExpiresSeconds: number;

  constructor(
    private readonly db: AppDbContext,
    private readonly lookup: CrmUniversityLookupService,
    private readonly storage: PublicAssetStorageService,
    config: ConfigService,
  ) {
    this.uploadUrlExpiresSeconds =
      config.get<number>('STORAGE_UPLOAD_URL_EXPIRES_SECONDS') ?? 900;
  }

  async generateUploadUrl(
    uniId: string,
    dto: GenerateUniAssetUploadUrlRequestDto,
  ): Promise<GenerateUniAssetUploadUrlResponseDto> {
    await this.lookup.loadUniversityOrThrow(uniId);
    const storageKey = this.storageKey(uniId, dto.kind);
    const uploadUrl = await this.storage.generateUploadUrl(
      storageKey,
      dto.mimeType,
      this.uploadUrlExpiresSeconds,
    );
    return {
      uploadUrl,
      storageKey,
      headers: { 'Content-Type': dto.mimeType },
      expiresInSeconds: this.uploadUrlExpiresSeconds,
    };
  }

  async confirmUpload(
    uniId: string,
    dto: ConfirmUniAssetUploadRequestDto,
  ): Promise<ConfirmUniAssetUploadResponseDto> {
    const university = await this.lookup.loadUniversityOrThrow(uniId);
    const expectedKey = this.storageKey(uniId, dto.kind);
    if (dto.storageKey !== expectedKey) {
      throw new BadRequestException('Storage key does not match this university image.');
    }

    const head = await this.storage.head(expectedKey);
    if (!head) {
      throw new BadRequestException('File not found in storage. Upload it first.');
    }
    const contentType = (head.contentType ?? '').split(';')[0].trim().toLowerCase();
    if (!ALLOWED_MIME.has(contentType)) {
      throw new BadRequestException('Use a JPEG, PNG, or WebP image.');
    }
    if (head.size < 1 || head.size > UNI_ASSET_MAX_BYTES) {
      throw new BadRequestException('Image must be 5 MB or smaller.');
    }

    const url = this.storage.fileUrl(expectedKey, Date.now());
    if (dto.kind === UniAssetKind.COVER) {
      university.coverImageUrl = url;
    } else {
      university.logoUrl = url;
    }
    await this.db.universities.save(university);

    return {
      coverImageUrl: university.coverImageUrl ?? null,
      logoUrl: university.logoUrl ?? null,
    };
  }

  private storageKey(uniId: string, kind: UniAssetKind): string {
    return `${uniId}/${kind}`;
  }
}
