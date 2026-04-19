import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import { ApplicationDocumentVersions } from '@entity/entities/ApplicationDocumentVersions.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { Applications } from '@entity/entities/Applications.entity';
import { LeadDocuments } from '@entity/entities/LeadDocuments.entity';
import { LeadDocumentVersions } from '@entity/entities/LeadDocumentVersions.entity';
import { ApplicationDocumentOverallStatus } from '@shared/enums/ApplicationDocumentOverallStatus.enum';
import { ApplicationDocumentSourceType } from '@shared/enums/ApplicationDocumentSourceType.enum';
import { DocumentScope } from '@shared/enums/DocumentScope.enum';
import { LeadDocumentOverallStatus } from '@shared/enums/LeadDocumentOverallStatus.enum';
import { StorageProvider } from '@shared/enums/StorageProvider.enum';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';
import { VerificationStatus } from '@shared/enums/VerificationStatus.enum';
import { ValidationException } from '@shared/exceptions/ValidationException';
import type { IStorageService } from '@shared/interfaces/IStorageService.interface';
import { IStorageService as IStorageServiceToken } from '@shared/tokens/injection.tokens';
import { GenerateApplicationDocumentUploadUrlRequestDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlRequestDto';
import { GenerateApplicationDocumentUploadUrlResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlResponseDto';
import { ApplicationMapper } from './helpers/ApplicationMapper';
import { ApplicationDocumentUploadPolicy } from './helpers/ApplicationDocumentUploadPolicy';
import { ApplicationValidator } from './helpers/ApplicationValidator';
import { ApplicationAccessService } from './helpers/ApplicationAccessService';
import type { PendingUploadInitializationResult } from './helpers/application-upload.types';

const UPLOAD_URL_EXPIRES_SECONDS = 900;

@Injectable()
export class ApplicationDocumentService {
  constructor(
    private readonly db: AppDbContext,
    private readonly validator: ApplicationValidator,
    private readonly access: ApplicationAccessService,
    private readonly uploadPolicy: ApplicationDocumentUploadPolicy,
    private readonly mapper: ApplicationMapper,
    @Inject(IStorageServiceToken) private readonly storage: IStorageService,
  ) {}

  async generateUploadUrl(
    currentUserId: string,
    applicationId: string,
    applicationRequirementId: string,
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): Promise<GenerateApplicationDocumentUploadUrlResponseDto> {
    await this.validator.validateGenerateUploadUrlRequest(dto);

    const application = await this.access.ensureLeadCanAccessApplicationOrThrow(
      currentUserId,
      applicationId,
    );

    const requirement = await this.resolveUploadRequirementOrThrow(
      applicationId,
      applicationRequirementId,
    );

    this.ensureRequirementBelongsToCurrentStageOrThrow(
      requirement,
      application,
    );

    const existingActiveDocumentCount =
      await this.db.applicationDocuments.count({
        where: {
          applicationId,
          applicationRequirementId,
          isActive: true,
        },
      });

    this.uploadPolicy.validateUploadOrThrow(
      requirement,
      dto,
      existingActiveDocumentCount,
    );

    const pending = await this.db.transaction((manager) => {
      if (
        requirement.sourceType === ApplicationDocumentSourceType.Application
      ) {
        return this.createPendingApplicationScopedUpload(
          manager,
          currentUserId,
          application,
          requirement,
          dto,
        );
      }
      return this.createPendingLeadScopedUpload(
        manager,
        currentUserId,
        application,
        requirement,
        dto,
      );
    });

    const uploadUrl = await this.storage.generateUploadUrl(
      pending.storageKey,
      pending.mimeType,
      UPLOAD_URL_EXPIRES_SECONDS,
    );

    return this.mapper.toGenerateUploadUrlResponse({
      applicationDocumentId: pending.applicationDocumentId,
      documentVersionId: pending.documentVersionId,
      uploadUrl,
      mimeType: pending.mimeType,
      expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
    });
  }

  private async resolveUploadRequirementOrThrow(
    applicationId: string,
    applicationRequirementId: string,
  ): Promise<ApplicationRequiredDocuments> {
    const requirement = await this.db.applicationRequiredDocuments.findOne({
      where: { id: applicationRequirementId, applicationId },
      relations: { SysDocumentType: true },
    });

    if (!requirement) {
      throw new NotFoundException('Application requirement not found');
    }

    return requirement;
  }

  private ensureRequirementBelongsToCurrentStageOrThrow(
    requirement: ApplicationRequiredDocuments,
    application: Applications,
  ): void {
    if (requirement.sysApplicationStageId == null) {
      throw new ValidationException(
        'Requirement is not associated with an application stage',
        { requirement: ['Requirement stage is missing'] },
      );
    }

    if (
      requirement.sysApplicationStageId !==
      application.currentSysApplicationStageId
    ) {
      throw new ValidationException(
        'Document requirement is not available in the current application stage',
        { requirement: ['Requirement does not belong to the current stage'] },
      );
    }
  }

  private async createPendingApplicationScopedUpload(
    manager: EntityManager,
    currentUserId: string,
    application: Applications,
    requirement: ApplicationRequiredDocuments,
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): Promise<PendingUploadInitializationResult> {
    const safeName = this.sanitizeFileName(dto.fileName);

    const appDoc =
      await this.createOrReuseApplicationDocumentForApplicationScope(
        manager,
        currentUserId,
        application.id,
        requirement,
        safeName,
      );

    const versionNumber = await this.getNextApplicationDocumentVersionNumber(
      manager,
      appDoc.id,
    );

    const storageKey = this.buildApplicationScopedStorageKey(
      application.id,
      requirement.id,
      appDoc.id,
      versionNumber,
      safeName,
    );

    const versionRepo = manager.getRepository(ApplicationDocumentVersions);
    const version = versionRepo.create({
      applicationDocumentId: appDoc.id,
      versionNumber,
      storageProvider: StorageProvider.Backblaze,
      storageKey,
      originalFileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSizeBytes: dto.fileSizeBytes,
      uploadStatus: UploadStatus.PENDING,
      verificationStatus: VerificationStatus.PENDING,
      uploadedByUserId: currentUserId,
    });
    await versionRepo.save(version);

    return {
      applicationDocumentId: appDoc.id,
      documentVersionId: version.id,
      documentVersionOwner: 'APPLICATION',
      storageKey,
      mimeType: dto.mimeType,
    };
  }

  /**
   * LEAD requirement: resolve lead master + linkage row, append pending LeadDocumentVersions,
   * return polymorphic pending-upload handles (documentVersionOwner = LEAD).
   */
  private async createPendingLeadScopedUpload(
    manager: EntityManager,
    currentUserId: string,
    application: Applications,
    requirement: ApplicationRequiredDocuments,
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): Promise<PendingUploadInitializationResult> {
    const leadId = application.leadId;
    if (!leadId) {
      throw new ValidationException('Application has no lead', {
        application: ['leadId is required for lead-scoped documents'],
      });
    }

    const safeName = this.sanitizeFileName(dto.fileName);

    const leadDocument = await this.findOrCreateLeadDocumentForUpload(
      manager,
      currentUserId,
      leadId,
      requirement.sysDocumentTypeId,
      safeName,
    );

    const appDoc = await this.createOrReuseApplicationDocumentLinkForLeadScope(
      manager,
      currentUserId,
      application.id,
      requirement,
      leadDocument.id,
    );

    const versionNumber = await this.getNextLeadDocumentVersionNumber(
      manager,
      leadDocument.id,
    );

    const storageKey = this.buildLeadScopedStorageKey(
      leadId,
      requirement.sysDocumentTypeId,
      leadDocument.id,
      versionNumber,
      safeName,
    );

    const versionRepo = manager.getRepository(LeadDocumentVersions);
    const version = versionRepo.create({
      leadDocumentId: leadDocument.id,
      versionNumber,
      storageProvider: StorageProvider.Backblaze,
      storageKey,
      originalFileName: dto.fileName,
      mimeType: dto.mimeType,
      fileSizeBytes: dto.fileSizeBytes,
      uploadStatus: UploadStatus.PENDING,
      verificationStatus: VerificationStatus.PENDING,
      uploadedByUserId: currentUserId,
    });
    await versionRepo.save(version);

    return {
      applicationDocumentId: appDoc.id,
      documentVersionId: version.id,
      documentVersionOwner: 'LEAD',
      storageKey,
      mimeType: dto.mimeType,
    };
  }

  private async createOrReuseApplicationDocumentForApplicationScope(
    manager: EntityManager,
    currentUserId: string,
    applicationId: string,
    requirement: ApplicationRequiredDocuments,
    latestFileName: string,
  ): Promise<ApplicationDocuments> {
    const repo = manager.getRepository(ApplicationDocuments);

    if (!requirement.isMultipleAllowed) {
      const existing = await repo.findOne({
        where: {
          applicationId,
          applicationRequirementId: requirement.id,
          isActive: true,
        },
      });
      if (existing) {
        existing.latestFileName = latestFileName;
        existing.updatedByUserId = currentUserId;
        existing.overallStatus = ApplicationDocumentOverallStatus.PendingUpload;
        existing.sourceScope = DocumentScope.Application;
        await repo.save(existing);
        return existing;
      }
    }

    const created = repo.create({
      applicationId,
      sysDocumentTypeId: requirement.sysDocumentTypeId,
      applicationRequirementId: requirement.id,
      sourceScope: DocumentScope.Application,
      latestFileName,
      overallStatus: ApplicationDocumentOverallStatus.PendingUpload,
      isActive: true,
      createdByUserId: currentUserId,
      updatedByUserId: currentUserId,
    });
    return await repo.save(created);
  }

  private async createOrReuseApplicationDocumentLinkForLeadScope(
    manager: EntityManager,
    currentUserId: string,
    applicationId: string,
    requirement: ApplicationRequiredDocuments,
    leadDocumentId: string,
  ): Promise<ApplicationDocuments> {
    const repo = manager.getRepository(ApplicationDocuments);

    if (!requirement.isMultipleAllowed) {
      const existing = await repo.findOne({
        where: {
          applicationId,
          applicationRequirementId: requirement.id,
          isActive: true,
          sourceScope: DocumentScope.Lead,
        },
      });
      if (existing) {
        existing.leadDocumentId = leadDocumentId;
        existing.updatedByUserId = currentUserId;
        existing.overallStatus = ApplicationDocumentOverallStatus.PendingUpload;
        await repo.save(existing);
        return existing;
      }
    }

    const created = repo.create({
      applicationId,
      sysDocumentTypeId: requirement.sysDocumentTypeId,
      applicationRequirementId: requirement.id,
      sourceScope: DocumentScope.Lead,
      leadDocumentId,
      overallStatus: ApplicationDocumentOverallStatus.PendingUpload,
      isActive: true,
      createdByUserId: currentUserId,
      updatedByUserId: currentUserId,
    });
    return repo.save(created);
  }

  private async findLeadDocumentCandidates(
    manager: EntityManager,
    leadId: string,
    sysDocumentTypeId: string,
  ): Promise<LeadDocuments[]> {
    const repo = manager.getRepository(LeadDocuments);
    return repo.find({
      where: { leadId, sysDocumentTypeId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * When any row is VERIFIED or UPLOADED, the lead already has a reusable asset — do not start another upload here.
   */
  private ensureReusableLeadDocumentDoesNotAlreadyExistOrThrow(
    candidates: LeadDocuments[],
  ): void {
    const blocking = candidates.find((d) =>
      this.isReusableLeadDocumentStatus(d.overallStatus),
    );
    if (blocking) {
      throw new ValidationException(
        'A reusable lead document already exists for this document type',
        {
          leadDocument: [
            `Lead document is already ${String(blocking.overallStatus)}; use the existing document instead of uploading again.`,
          ],
        },
      );
    }
  }

  /** Reusable-good master states: block issuing a new pending upload. */
  private isReusableLeadDocumentStatus(
    status: LeadDocumentOverallStatus | undefined,
  ): boolean {
    return (
      status === LeadDocumentOverallStatus.Verified ||
      status === LeadDocumentOverallStatus.Uploaded
    );
  }

  /** Only these aggregates may receive a new pending version in this flow. */
  private isUploadAllowedLeadDocumentStatus(
    status: LeadDocumentOverallStatus | undefined,
  ): boolean {
    return (
      status === LeadDocumentOverallStatus.Missing ||
      status === LeadDocumentOverallStatus.PendingUpload ||
      status === LeadDocumentOverallStatus.Rejected
    );
  }

  /**
   * ARCHIVED / REPLACED must never be reused for an active upload
   * (explicit guard even if upload-allowed rules evolve).
   */
  private isIgnoredForActiveUploadLeadDocumentStatus(
    status: LeadDocumentOverallStatus | undefined,
  ): boolean {
    return (
      status === LeadDocumentOverallStatus.Archived ||
      status === LeadDocumentOverallStatus.Replaced
    );
  }

  /**
   * Prefer the newest uploadable row (candidates are newest-first).
   * Skips ARCHIVED / REPLACED.
   */
  private selectUploadableLeadDocument(
    candidates: LeadDocuments[],
  ): LeadDocuments | undefined {
    return candidates.find(
      (d) =>
        !this.isIgnoredForActiveUploadLeadDocumentStatus(d.overallStatus) &&
        this.isUploadAllowedLeadDocumentStatus(d.overallStatus),
    );
  }

  private async findOrCreateLeadDocumentForUpload(
    manager: EntityManager,
    currentUserId: string,
    leadId: string,
    sysDocumentTypeId: string,
    latestFileName: string,
  ): Promise<LeadDocuments> {
    const candidates = await this.findLeadDocumentCandidates(
      manager,
      leadId,
      sysDocumentTypeId,
    );

    this.ensureReusableLeadDocumentDoesNotAlreadyExistOrThrow(candidates);

    const uploadable = this.selectUploadableLeadDocument(candidates);
    const repo = manager.getRepository(LeadDocuments);

    if (uploadable) {
      uploadable.latestFileName = latestFileName;
      uploadable.updatedByUserId = currentUserId;
      uploadable.overallStatus = LeadDocumentOverallStatus.PendingUpload;
      return repo.save(uploadable);
    }

    const created = repo.create({
      leadId,
      sysDocumentTypeId,
      latestFileName,
      overallStatus: LeadDocumentOverallStatus.PendingUpload,
      createdByUserId: currentUserId,
      updatedByUserId: currentUserId,
    });
    return repo.save(created);
  }

  private async getNextApplicationDocumentVersionNumber(
    manager: EntityManager,
    applicationDocumentId: string,
  ): Promise<number> {
    const repo = manager.getRepository(ApplicationDocumentVersions);

    const row = await repo.findOne({
      where: { applicationDocumentId },
      order: { versionNumber: 'DESC' },
    });

    const maxVersionNumber = Number(row?.versionNumber ?? 0);
    return maxVersionNumber + 1;
  }

  private async getNextLeadDocumentVersionNumber(
    manager: EntityManager,
    leadDocumentId: string,
  ): Promise<number> {
    const repo = manager.getRepository(LeadDocumentVersions);
    const row = await repo.findOne({
      where: { leadDocumentId },
      order: { versionNumber: 'DESC' },
    });

    const maxVersionNumber = Number(row?.versionNumber ?? 0);
    return maxVersionNumber + 1;
  }

  private buildApplicationScopedStorageKey(
    applicationId: string,
    requirementId: string,
    applicationDocumentId: string,
    versionNumber: number,
    safeFileName: string,
  ): string {
    return `applications/${applicationId}/requirements/${requirementId}/documents/${applicationDocumentId}/versions/${versionNumber}/${safeFileName}`;
  }

  private buildLeadScopedStorageKey(
    leadId: string,
    sysDocumentTypeId: string,
    leadDocumentId: string,
    versionNumber: number,
    safeFileName: string,
  ): string {
    return `leads/${leadId}/document-types/${sysDocumentTypeId}/documents/${leadDocumentId}/versions/${versionNumber}/${safeFileName}`;
  }

  private sanitizeFileName(fileName: string): string {
    const base = fileName.replace(/\\/g, '/').split('/').pop() ?? fileName;
    const cleaned = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^\.+/, '');
    const safe = cleaned.length > 200 ? cleaned.slice(0, 200) : cleaned;
    return safe.length > 0 ? safe : 'file';
  }
}
