import {
  Injectable,
  Inject,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import type { IStorageService } from '@shared/interfaces/IStorageService.interface';
import { IStorageService as IStorageServiceToken } from '@shared/tokens/injection.tokens';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';
import { VerificationStatus } from '@shared/enums/VerificationStatus.enum';
import { CreateUploadUrlDto } from '@shared/dtos/documents/CreateUploadUrlDto';
import { CreateUploadUrlResponseDto } from '@shared/dtos/documents/CreateUploadUrlResponseDto';
import { ConfirmUploadDto } from '@shared/dtos/documents/ConfirmUploadDto';
import { DownloadUrlResponseDto } from '@shared/dtos/documents/DownloadUrlResponseDto';
import { SysDocumentTypes } from '@entity/entities/SysDocumentTypes.entity';
import { Document } from '@entity/entities/Document.entity';
import { DocumentVersion } from '@entity/entities/DocumentVersion.entity';

const STORAGE_PROVIDER = 'backblaze';

@Injectable()
export class DocumentService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(IStorageServiceToken) private readonly storage: IStorageService,
  ) {}

  async createUploadUrl(
    dto: CreateUploadUrlDto,
    userId?: string,
  ): Promise<CreateUploadUrlResponseDto> {
    const documentType = await this.db.documentTypes.findOne({
      where: { id: dto.documentTypeId },
    });
    if (!documentType) {
      throw new BadRequestException('Document type not found');
    }
    if (!documentType.isActive) {
      throw new BadRequestException('Document type is not active');
    }
    if (documentType.allowedMimeTypes) {
      const allowed = documentType.allowedMimeTypes.split(',').map((s) => s.trim().toLowerCase());
      if (!allowed.includes(dto.mimeType.trim().toLowerCase())) {
        throw new BadRequestException(
          `MIME type ${dto.mimeType} is not allowed for this document type`,
        );
      }
    }
    if (
      documentType.maxFileSizeBytes != null &&
      dto.fileSizeBytes > documentType.maxFileSizeBytes
    ) {
      throw new BadRequestException(
        `File size exceeds maximum allowed (${documentType.maxFileSizeBytes} bytes)`,
      );
    }

    const document = this.db.documents.create({
      documentTypeId: dto.documentTypeId,
      createdByUserId: userId ?? undefined,
      updatedByUserId: userId ?? undefined,
    });
    await this.db.documents.save(document);

    const nextVersion = await this.getNextVersionNumber(document.id);
    const storageKey = this.buildStorageKey(
      document.id,
      nextVersion,
      dto.fileName,
    );

    const uploadUrl = await this.storage.generateUploadUrl(
      storageKey,
      dto.mimeType,
    );

    const version = this.db.documentVersions.create({
      documentId: document.id,
      versionNumber: nextVersion,
      storageProvider: STORAGE_PROVIDER,
      storageKey,
      originalFileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSizeBytes: dto.fileSizeBytes,
      uploadStatus: UploadStatus.PENDING,
      verificationStatus: VerificationStatus.PENDING,
      uploadedByUserId: userId ?? undefined,
    });
    await this.db.documentVersions.save(version);

    return {
      uploadUrl,
      versionId: version.id,
      documentId: document.id,
    };
  }

  async confirmUpload(dto: ConfirmUploadDto, userId?: string): Promise<void> {
    const version = await this.db.documentVersions.findOne({
      where: { id: dto.versionId },
      relations: { document: true },
    });
    if (!version) {
      throw new NotFoundException('Document version not found');
    }
    if (version.uploadStatus !== UploadStatus.PENDING) {
      throw new BadRequestException(
        `Version is not in PENDING state (current: ${version.uploadStatus})`,
      );
    }

    const exists = await this.storage.objectExists(version.storageKey);
    if (!exists) {
      throw new BadRequestException(
        'Object not found in storage. Upload may have failed or not completed.',
      );
    }

    version.uploadStatus = UploadStatus.UPLOADED;
    if (userId) version.uploadedByUserId = userId;
    await this.db.documentVersions.save(version);

    const doc = version.document;
    doc.currentVersionId = version.id;
    if (userId) doc.updatedByUserId = userId;
    await this.db.documents.save(doc);
  }

  async generateDownloadUrl(documentId: string): Promise<DownloadUrlResponseDto> {
    const document = await this.db.documents.findOne({
      where: { id: documentId },
      relations: { versions: false },
    });
    if (!document) {
      throw new NotFoundException('Document not found');
    }
    if (!document.currentVersionId) {
      throw new BadRequestException('Document has no current version');
    }

    const version = await this.db.documentVersions.findOne({
      where: { id: document.currentVersionId },
    });
    if (!version) {
      throw new NotFoundException('Current document version not found');
    }
    if (version.uploadStatus !== UploadStatus.UPLOADED) {
      throw new BadRequestException(
        'Current version is not uploaded yet',
      );
    }

    const url = await this.storage.generateDownloadUrl(version.storageKey);
    return { url };
  }

  private async getNextVersionNumber(documentId: string): Promise<number> {
    const result = await this.db.documentVersions
      .createQueryBuilder('v')
      .select('MAX(v.versionNumber)', 'max')
      .where('v.documentId = :documentId', { documentId })
      .getRawOne<{ max: number | null }>();
    const max = result?.max ?? 0;
    return max + 1;
  }

  private buildStorageKey(
    documentId: string,
    versionNumber: number,
    fileName: string,
  ): string {
    const ext = fileName.includes('.')
      ? (fileName.split('.').pop() ?? '').replace(/\W/g, '') || 'bin'
      : 'bin';
    return `documents/${documentId}/v${versionNumber}.${ext}`;
  }
}
