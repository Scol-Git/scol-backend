import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  GoneException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IsNull, type FindOptionsWhere } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { BulkImportBatches } from '@entity/entities/BulkImportBatches.entity';
import { IStorageService as IStorageServiceToken } from '@shared/tokens/injection.tokens';
import type { IStorageService } from '@shared/interfaces/IStorageService.interface';
import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import {
  BULK_IMPORT_FINAL_STATUSES,
  BulkImportStatus,
} from '@shared/enums/crm/BulkImportStatus.enum';
import { GenerateBulkImportUploadUrlRequestDto } from '@shared/dtos/crm/bulk-imports/GenerateBulkImportUploadUrlRequestDto';
import { GenerateBulkImportUploadUrlResponseDto } from '@shared/dtos/crm/bulk-imports/GenerateBulkImportUploadUrlResponseDto';
import { ConfirmBulkImportUploadResponseDto } from '@shared/dtos/crm/bulk-imports/ConfirmBulkImportUploadResponseDto';
import { BulkImportStatusResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportStatusResponseDto';
import { BulkImportListRequestDto } from '@shared/dtos/crm/bulk-imports/BulkImportListRequestDto';
import { BulkImportListItemDto } from '@shared/dtos/crm/bulk-imports/BulkImportListItemDto';
import { BulkImportListResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportListResponseDto';
import { BulkImportDetailResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportDetailResponseDto';
import { BulkImportDownloadResponseDto } from '@shared/dtos/crm/bulk-imports/BulkImportDownloadResponseDto';
import { BulkImportStorageKeyBuilder } from './helpers/BulkImportStorageKeyBuilder';
import { BulkImportProcessor } from './BulkImportProcessor';
import { BulkImportFileCleanupService } from './BulkImportFileCleanupService';
import { buildTemplate } from './schema/TemplateBuilder';
import { UNIVERSITY_SCHEMA } from './university/university.schema';
import { COURSE_SCHEMA } from './course/course.schema';

const UPLOAD_URL_TTL_SECONDS = 900; // 15 min
const DOWNLOAD_URL_TTL_MS = 60 * 60 * 1000; // matches the storage service (1 h)

const iso = (d: Date | null | undefined): string | null => (d ? new Date(d).toISOString() : null);

@Injectable()
export class BulkImportBatchService {
  constructor(
    private readonly db: AppDbContext,
    @Inject(IStorageServiceToken) private readonly storage: IStorageService,
    private readonly keyBuilder: BulkImportStorageKeyBuilder,
    private readonly processor: BulkImportProcessor,
    private readonly config: ConfigService,
    private readonly fileCleanup: BulkImportFileCleanupService,
  ) {}

  private get maxFileBytes(): number {
    return Number(this.config.get<string>('BULK_IMPORT_MAX_FILE_BYTES', '20971520'));
  }

  async generateUploadUrl(
    userId: string,
    dto: GenerateBulkImportUploadUrlRequestDto,
  ): Promise<GenerateBulkImportUploadUrlResponseDto> {
    if (!dto.fileName.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only .csv files are accepted');
    }
    if (dto.fileSizeBytes < 1 || dto.fileSizeBytes > this.maxFileBytes) {
      throw new BadRequestException(`File size must be between 1 byte and ${this.maxFileBytes} bytes`);
    }

    const id = randomUUID();
    const key = this.keyBuilder.originalKey(dto.type, id);
    const batch = this.db.bulkImportBatches.create({
      id,
      type: dto.type,
      status: BulkImportStatus.AWAITING_UPLOAD,
      fileName: dto.fileName.slice(0, 255),
      fileSizeBytes: dto.fileSizeBytes,
      originalFileKey: key,
      uploadedBy: userId,
    });
    await this.db.bulkImportBatches.save(batch);

    const uploadUrl = await this.storage.generateUploadUrl(key, 'text/csv', UPLOAD_URL_TTL_SECONDS);
    return {
      batchId: id,
      uploadUrl,
      expiresAt: new Date(Date.now() + UPLOAD_URL_TTL_SECONDS * 1000).toISOString(),
    };
  }

  async confirmUpload(batchId: string): Promise<ConfirmBulkImportUploadResponseDto> {
    const batch = await this.getOrThrow(batchId);
    if (batch.status !== BulkImportStatus.AWAITING_UPLOAD) {
      throw new ConflictException('Batch is not awaiting upload');
    }
    const size = await this.storage.getObjectSize(batch.originalFileKey);
    if (size === null) throw new BadRequestException('File not found in storage. Upload it first.');
    if (size > this.maxFileBytes) {
      throw new BadRequestException(`File is larger than the ${this.maxFileBytes} byte limit`);
    }

    const result = await this.db.bulkImportBatches
      .createQueryBuilder()
      .update(BulkImportBatches)
      .set({ status: BulkImportStatus.QUEUED, queuedAt: () => 'now()', fileSizeBytes: size })
      .where('id = :id AND status = :status', { id: batchId, status: BulkImportStatus.AWAITING_UPLOAD })
      .execute();
    if (!result.affected) throw new ConflictException('Batch is not awaiting upload');

    // After the response is sent: nudge the worker so the user does not wait for the next cron tick.
    setImmediate(() => void this.processor.runNext());
    return { batchId, status: BulkImportStatus.QUEUED };
  }

  async getStatus(batchId: string): Promise<BulkImportStatusResponseDto> {
    const b = await this.db.bulkImportBatches.findOne({
      where: { id: batchId, deletedAt: IsNull() },
      select: {
        id: true, status: true, totalRows: true, processedRows: true, createdCount: true,
        updatedCount: true, skippedCount: true, errorCount: true, warningCount: true, failureReason: true,
      },
    });
    if (!b) throw new NotFoundException('Bulk import batch not found');
    return {
      batchId: b.id,
      status: b.status,
      totalRows: b.totalRows,
      processedRows: b.processedRows,
      createdCount: b.createdCount,
      updatedCount: b.updatedCount,
      skippedCount: b.skippedCount,
      errorCount: b.errorCount,
      warningCount: b.warningCount,
      failureReason: b.failureReason ?? null,
      isFinal: BULK_IMPORT_FINAL_STATUSES.includes(b.status),
    };
  }

  async list(dto: BulkImportListRequestDto): Promise<BulkImportListResponseDto> {
    const page = dto.page ?? 1;
    const pageSize = Math.min(dto.pageSize ?? 20, 100);
    const where: FindOptionsWhere<BulkImportBatches> = { deletedAt: IsNull() };
    if (dto.type) where.type = dto.type;
    if (dto.status) where.status = dto.status;

    const [rows, total] = await this.db.bulkImportBatches.findAndCount({
      where,
      relations: { UploadedByUser: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return { items: rows.map((r) => this.toListItem(r)), page, pageSize, total };
  }

  async getDetail(batchId: string): Promise<BulkImportDetailResponseDto> {
    const b = await this.db.bulkImportBatches.findOne({
      where: { id: batchId, deletedAt: IsNull() },
      relations: { UploadedByUser: true },
    });
    if (!b) throw new NotFoundException('Bulk import batch not found');

    const ownedDraftCount =
      b.type === BulkImportType.UNIVERSITY
        ? await this.db.universities.count({ where: { importBatchId: b.id, isPublished: false, deletedAt: IsNull() } })
        : await this.db.courseIntakes.count({ where: { importBatchId: b.id, isPublished: false, deletedAt: IsNull() } });

    return {
      ...this.toListItem(b),
      fileSizeBytes: b.fileSizeBytes,
      skippedCount: b.skippedCount,
      publishedCount: b.publishedCount,
      processedRows: b.processedRows,
      failureReason: b.failureReason ?? null,
      ownedDraftCount,
      hasErrorsFile: b.errorsFileKey != null && b.filesDeletedAt == null,
      hasOriginalFile: b.filesDeletedAt == null,
      filesDeletedAt: iso(b.filesDeletedAt),
      startedAt: iso(b.startedAt),
      publishedBy: b.publishedBy ?? null,
    };
  }

  async getOriginalDownload(batchId: string): Promise<BulkImportDownloadResponseDto> {
    const b = await this.getOrThrow(batchId);
    this.assertFilesKept(b);
    return this.download(b.originalFileKey);
  }

  async getErrorsDownload(batchId: string): Promise<BulkImportDownloadResponseDto> {
    const b = await this.getOrThrow(batchId);
    this.assertFilesKept(b);
    if (!b.errorsFileKey) throw new NotFoundException('This batch has no errors file');
    return this.download(b.errorsFileKey);
  }

  getTemplate(type: 'university' | 'course'): { buffer: Buffer; fileName: string } {
    const schema = type === 'university' ? UNIVERSITY_SCHEMA : COURSE_SCHEMA;
    return { buffer: buildTemplate(schema), fileName: `${type}-template.csv` };
  }

  private async download(key: string): Promise<BulkImportDownloadResponseDto> {
    return {
      downloadUrl: await this.storage.generateDownloadUrl(key),
      expiresAt: new Date(Date.now() + DOWNLOAD_URL_TTL_MS).toISOString(),
    };
  }

  private assertFilesKept(b: BulkImportBatches): void {
    if (b.filesDeletedAt) {
      throw new GoneException(`Files are deleted after ${this.fileCleanup.retentionDays} days`);
    }
  }

  private async getOrThrow(batchId: string): Promise<BulkImportBatches> {
    const b = await this.db.bulkImportBatches.findOne({ where: { id: batchId, deletedAt: IsNull() } });
    if (!b) throw new NotFoundException('Bulk import batch not found');
    return b;
  }

  private toListItem(b: BulkImportBatches): BulkImportListItemDto {
    return {
      batchId: b.id,
      type: b.type,
      status: b.status,
      fileName: b.fileName,
      totalRows: b.totalRows,
      createdCount: b.createdCount,
      updatedCount: b.updatedCount,
      errorCount: b.errorCount,
      warningCount: b.warningCount,
      // sys_Users has no display-name column; the account email identifies the uploader.
      uploadedBy: { id: b.uploadedBy, name: b.UploadedByUser?.email ?? '' },
      createdAt: new Date(b.createdAt).toISOString(),
      processedAt: iso(b.processedAt),
      publishedAt: iso(b.publishedAt),
    };
  }
}
