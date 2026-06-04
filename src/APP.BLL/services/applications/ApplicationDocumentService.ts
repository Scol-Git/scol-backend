import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EntityManager, In, Not } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ApplicationActivities } from '@entity/entities/ApplicationActivities.entity';
import { ApplicationDocuments } from '@entity/entities/ApplicationDocuments.entity';
import { ApplicationDocumentVersions } from '@entity/entities/ApplicationDocumentVersions.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { Applications } from '@entity/entities/Applications.entity';
import { LeadDocuments } from '@entity/entities/LeadDocuments.entity';
import { LeadDocumentVersions } from '@entity/entities/LeadDocumentVersions.entity';
import { ApplicationDocumentSourceType } from '@shared/enums/ApplicationDocumentSourceType.enum';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';
import { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';
import { StorageProvider } from '@shared/enums/StorageProvider.enum';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';
import { VerificationStatus } from '@shared/enums/VerificationStatus.enum';
import { ConfirmApplicationDocumentUploadRequestDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadRequestDto';
import { ConfirmApplicationDocumentUploadResponseDto } from '@shared/dtos/applications/ConfirmApplicationDocumentUploadResponseDto';
import { GenerateApplicationDocumentDownloadResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentDownloadResponseDto';
import { ValidationException } from '@shared/exceptions/ValidationException';
import type { IStorageService } from '@shared/interfaces/IStorageService.interface';
import { IStorageService as IStorageServiceToken } from '@shared/tokens/injection.tokens';
import { GenerateApplicationDocumentUploadUrlRequestDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlRequestDto';
import { GenerateApplicationDocumentUploadUrlResponseDto } from '@shared/dtos/applications/GenerateApplicationDocumentUploadUrlResponseDto';
import { ApplicationActivityService } from './helpers/ApplicationActivityService';
import { ApplicationMapper } from './helpers/ApplicationMapper';
import { ApplicationDocumentUploadPolicy } from './helpers/ApplicationDocumentUploadPolicy';
import { ApplicationValidator } from './helpers/ApplicationValidator';
import { ApplicationAccessService } from './helpers/ApplicationAccessService';
import { ApplicationDocumentLinker } from './helpers/ApplicationDocumentLinker';
import { ApplicationDocumentVersionSequencer } from './helpers/ApplicationDocumentVersionSequencer';
import { ApplicationDocumentStorageKeyBuilder } from './helpers/ApplicationDocumentStorageKeyBuilder';
import type { PendingUploadInitializationResult } from './helpers/application-upload.types';

type PendingUploadForConfirmation = {
  documentScope: 'APPLICATION' | 'LEAD';
  documentId: string;
  documentVersionId: string;
  storageKey: string;
  originalFileName: string;
  uploadStatus: UploadStatus | null | undefined;
};

type DownloadableDocument = {
  documentScope: 'APPLICATION' | 'LEAD';
  documentId: string;
  documentVersionId: string;
  storageKey: string;
  fileName: string;
};

type ResolvedLeadDocument = {
  document: LeadDocuments;
  version: LeadDocumentVersions;
};

type ResolvedApplicationDocument = {
  document: ApplicationDocuments;
  version: ApplicationDocumentVersions;
};

@Injectable()
export class ApplicationDocumentService {
  private readonly uploadUrlExpiresSeconds: number;
  private readonly downloadUrlExpiresSeconds: number;

  constructor(
    private readonly db: AppDbContext,
    private readonly validator: ApplicationValidator,
    private readonly access: ApplicationAccessService,
    private readonly activity: ApplicationActivityService,
    private readonly uploadPolicy: ApplicationDocumentUploadPolicy,
    private readonly mapper: ApplicationMapper,
    private readonly documentLinker: ApplicationDocumentLinker,
    private readonly versionSequencer: ApplicationDocumentVersionSequencer,
    private readonly storageKeyBuilder: ApplicationDocumentStorageKeyBuilder,
    @Inject(IStorageServiceToken) private readonly storage: IStorageService,
    private readonly config: ConfigService,
  ) {
    this.uploadUrlExpiresSeconds =
      this.config.get<number>('STORAGE_UPLOAD_URL_EXPIRES_SECONDS') ?? 900;
    this.downloadUrlExpiresSeconds =
      this.config.get<number>('STORAGE_DOWNLOAD_URL_EXPIRES_SECONDS') ?? 3600;
  }

  async generateUploadUrl(
    currentUserId: string,
    applicationId: string,
    applicationRequirementId: string,
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): Promise<GenerateApplicationDocumentUploadUrlResponseDto> {
    return this.generateUploadUrlForLead(
      currentUserId,
      applicationId,
      applicationRequirementId,
      dto,
    );
  }

  async generateUploadUrlForLead(
    currentUserId: string,
    applicationId: string,
    applicationRequirementId: string,
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
  ): Promise<GenerateApplicationDocumentUploadUrlResponseDto> {
    const application = await this.access.ensureLeadCanAccessApplicationOrThrow(
      currentUserId,
      applicationId,
    );
    return this.generateUploadUrlForAuthorizedApplication(
      application,
      applicationRequirementId,
      dto,
      currentUserId,
    );
  }

  async generateUploadUrlForAuthorizedApplication(
    application: Applications,
    applicationRequirementId: string,
    dto: GenerateApplicationDocumentUploadUrlRequestDto,
    actedByUserId: string,
  ): Promise<GenerateApplicationDocumentUploadUrlResponseDto> {
    await this.validator.validateGenerateUploadUrlRequest(dto);

    const requirement = await this.resolveUploadRequirementOrThrow(
      application.id,
      applicationRequirementId,
    );

    this.ensureRequirementBelongsToCurrentStageOrThrow(
      requirement,
      application,
    );

    const existingActiveDocumentCount =
      await this.countExistingActiveDocumentsForRequirement(
        application,
        requirement,
      );

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
          actedByUserId,
          application,
          requirement,
          dto,
        );
      }
      return this.createPendingLeadScopedUpload(
        manager,
        actedByUserId,
        application,
        requirement,
        dto,
      );
    });

    const uploadUrl = await this.storage.generateUploadUrl(
      pending.storageKey,
      pending.mimeType,
      this.uploadUrlExpiresSeconds,
    );

    return this.mapper.toGenerateUploadUrlResponse({
      documentId: String(pending.documentId),
      documentVersionId: pending.documentVersionId,
      uploadUrl,
      mimeType: pending.mimeType,
      expiresInSeconds: this.uploadUrlExpiresSeconds,
    });
  }

  async confirmUpload(
    currentUserId: string,
    applicationId: string,
    applicationRequirementId: string,
    dto: ConfirmApplicationDocumentUploadRequestDto,
  ): Promise<ConfirmApplicationDocumentUploadResponseDto> {
    return this.confirmUploadForLead(
      currentUserId,
      applicationId,
      applicationRequirementId,
      dto,
    );
  }

  async confirmUploadForLead(
    currentUserId: string,
    applicationId: string,
    applicationRequirementId: string,
    dto: ConfirmApplicationDocumentUploadRequestDto,
  ): Promise<ConfirmApplicationDocumentUploadResponseDto> {
    const application = await this.access.ensureLeadCanAccessApplicationOrThrow(
      currentUserId,
      applicationId,
    );

    return this.confirmUploadForAuthorizedApplication(
      application,
      applicationRequirementId,
      dto,
      currentUserId,
    );
  }

  async confirmUploadForAuthorizedApplication(
    application: Applications,
    applicationRequirementId: string,
    dto: ConfirmApplicationDocumentUploadRequestDto,
    actedByUserId: string,
  ): Promise<ConfirmApplicationDocumentUploadResponseDto> {
    await this.validator.validateConfirmUploadRequest(dto);

    const requirement = await this.resolveUploadRequirementOrThrow(
      application.id,
      applicationRequirementId,
    );

    this.ensureRequirementBelongsToCurrentStageOrThrow(
      requirement,
      application,
    );

    const pending = await this.resolvePendingUploadOrThrow(
      application,
      requirement,
      dto,
    );

    if (pending.uploadStatus === UploadStatus.UPLOADED) {
      return this.mapper.toConfirmUploadResponse(UploadStatus.UPLOADED);
    }

    const objectExists = await this.storage.objectExists(pending.storageKey);
    if (!objectExists) {
      throw new ValidationException(
        'Uploaded file not found in storage for confirmation',
        { documentVersion: ['Storage object does not exist'] },
      );
    }

    await this.db.transaction(async (manager) => {
      if (pending.documentScope === 'APPLICATION') {
        await this.confirmApplicationScopedUpload(
          manager,
          actedByUserId,
          pending,
        );
      } else {
        await this.confirmLeadScopedUpload(manager, actedByUserId, pending);
      }

      //await this.markRequirementInProgressIfNeeded(manager, requirement.id);

      await this.activity.logDocumentUploaded(manager, {
        applicationId: application.id,
        actedByUserId,
        documentRequirementId: requirement.id,
        documentId: pending.documentId,
        documentVersionId: pending.documentVersionId,
        documentScope: pending.documentScope,
        fileName: this.storageKeyBuilder.sanitizeFileName(
          pending.originalFileName,
        ),
      });
    });

    return this.mapper.toConfirmUploadResponse(UploadStatus.UPLOADED);
  }

  async generateDownloadUrl(
    currentUserId: string,
    applicationId: string,
    documentId: string,
  ): Promise<GenerateApplicationDocumentDownloadResponseDto> {
    return this.generateDownloadUrlForLead(
      currentUserId,
      applicationId,
      documentId,
    );
  }

  async generateDownloadUrlForLead(
    currentUserId: string,
    applicationId: string,
    documentId: string,
  ): Promise<GenerateApplicationDocumentDownloadResponseDto> {
    const application = await this.access.ensureLeadCanAccessApplicationOrThrow(
      currentUserId,
      applicationId,
    );
    return this.generateDownloadUrlForAuthorizedApplication(
      application,
      documentId,
    );
  }

  // ==============================
  // MAIN DELETE ENTRY
  // ==============================
  async deleteApplicationDocument(
    currentUserId: string,
    applicationId: string,
    documentId: string,
  ): Promise<{ success: true }> {
    const application = await this.access.ensureLeadCanAccessApplicationOrThrow(
      currentUserId,
      applicationId,
    );

    return this.deleteDocumentForAuthorizedApplication(application, documentId);
  }

  // ==============================
  // ORCHESTRATOR (APPLICATION + LEAD)
  // ==============================
  async deleteDocumentForAuthorizedApplication(
    application: Applications,
    documentId: string,
  ): Promise<{ success: true }> {
    // 1. APPLICATION scoped delete first
    const applicationResolved = await this.resolveApplicationScopedOrNull(
      application.id,
      documentId,
    );

    if (applicationResolved) {
      // 3. Delete version first
      await this.db.applicationDocumentVersions.delete(
        applicationResolved.version.id,
      );

      // 4. Delete document
      await this.db.applicationDocuments.delete(
        applicationResolved.document.id,
      );
      return { success: true };
    }

    // 2. LEAD scoped delete
    if (!application.leadId) {
      throw new NotFoundException('Document cannot be deleted');
    }

    const leadResolved = await this.resolveLeadScopedOrNull(
      application,
      application.leadId,
      documentId,
    );

    if (leadResolved) {
      // 3. Delete version first
      await this.db.leadDocumentVersions.delete(leadResolved.version.id);

      // 4. Delete document
      await this.db.leadDocuments.delete(leadResolved.document.id);
      return { success: true };
    }

    throw new NotFoundException('Document cannot be deleted');
  }

  // ==============================
  // RESOLVE LEAD (DELETE RULES)
  // ==============================
  private async resolveLeadScopedOrNull(
    application: Applications | null,
    leadId: string,
    documentId: string,
  ): Promise<ResolvedLeadDocument | null> {
    const document = await this.db.leadDocuments.findOne({
      where: {
        id: documentId,
        leadId,
        overallStatus: Not(ApplicationDocumentStatus.Verified),
      },
    });

    if (!document?.currentLeadDocumentVersionId) {
      return null;
    }

    // 2. Resolve version

    const version = await this.db.leadDocumentVersions.findOne({
      where: {
        id: document.currentLeadDocumentVersionId,
        leadDocumentId: document.id,
        uploadStatus: UploadStatus.UPLOADED,
      },
    });

    if (!version) {
      return null;
    }

    return { document, version };
  }

  // ==============================
  // RESOLVE APPLICATION DOC
  // ==============================
  private async resolveApplicationScopedOrNull(
    applicationId: string,
    documentId: string,
  ): Promise<ResolvedApplicationDocument | null> {
    const document = await this.db.applicationDocuments.findOne({
      where: {
        id: documentId,
        applicationId,
        overallStatus: Not(ApplicationDocumentStatus.Verified),
      },
    });

    if (!document?.currentVersionId) {
      return null;
    }

    const version = await this.db.applicationDocumentVersions.findOne({
      where: {
        id: document.currentVersionId,
        applicationDocumentId: document.id,
        uploadStatus: UploadStatus.UPLOADED,
      },
    });

    if (!version) {
      return null;
    }

    return { document, version };
  }

  async generateDownloadUrlForAuthorizedApplication(
    application: Applications,
    documentId: string,
  ): Promise<GenerateApplicationDocumentDownloadResponseDto> {
    const downloadable =
      (await this.resolveApplicationScopedDownloadOrNull(
        application.id,
        documentId,
      )) ??
      (await this.resolveLeadScopedDownloadOrNull(application, documentId));

    if (!downloadable) {
      throw new NotFoundException('Document not found');
    }

    const url = await this.storage.generateDownloadUrl(downloadable.storageKey);

    return this.mapper.toDownloadResponse({
      url,
      expiresInSeconds: this.downloadUrlExpiresSeconds,
      fileName: downloadable.fileName,
    });
  }

  private async countExistingActiveDocumentsForRequirement(
    application: Applications,
    requirement: ApplicationRequiredDocuments,
  ): Promise<number> {
    if (requirement.sourceType === ApplicationDocumentSourceType.Lead) {
      if (!application.leadId) {
        throw new ValidationException('Application has no lead', {
          application: ['leadId is required for lead-scoped documents'],
        });
      }
      return this.db.leadDocuments.count({
        where: {
          leadId: application.leadId,
          sysDocumentTypeId: requirement.sysDocumentTypeId,
          overallStatus: In([
            ApplicationDocumentStatus.InProgress,
            ApplicationDocumentStatus.Verified,
          ]),
        },
      });
    }

    return this.db.applicationDocuments.count({
      where: {
        applicationId: application.id,
        applicationRequirementId: requirement.id,
        overallStatus: In([
          ApplicationDocumentStatus.InProgress,
          ApplicationDocumentStatus.Verified,
        ]),
      },
    });
  }

  private async resolvePendingUploadOrThrow(
    application: Applications,
    requirement: ApplicationRequiredDocuments,
    dto: ConfirmApplicationDocumentUploadRequestDto,
  ): Promise<PendingUploadForConfirmation> {
    if (requirement.sourceType === ApplicationDocumentSourceType.Application) {
      const pending = await this.resolvePendingApplicationScopedUploadOrThrow(
        application,
        requirement,
        dto,
      );
      this.ensureUploadCanBeConfirmedOrThrow(pending.uploadStatus);
      return pending;
    }

    if (requirement.sourceType === ApplicationDocumentSourceType.Lead) {
      const pending = await this.resolvePendingLeadScopedUploadOrThrow(
        application,
        requirement,
        dto,
      );
      this.ensureUploadCanBeConfirmedOrThrow(pending.uploadStatus);
      return pending;
    }

    throw new ValidationException(
      'Confirm upload is not supported for this requirement source',
      { sourceType: [`Unsupported source type ${requirement.sourceType}`] },
    );
  }

  private async resolvePendingApplicationScopedUploadOrThrow(
    application: Applications,
    requirement: ApplicationRequiredDocuments,
    dto: ConfirmApplicationDocumentUploadRequestDto,
  ): Promise<PendingUploadForConfirmation> {
    const document = await this.db.applicationDocuments.findOne({
      where: {
        id: dto.documentId,
        applicationId: application.id,
        applicationRequirementId: requirement.id,
      },
    });

    if (!document) {
      throw new ValidationException(
        'Application document not found or Document already uploaded',
        { document: ['Document not found or already uploaded'] },
      );
    }

    const version = await this.db.applicationDocumentVersions.findOne({
      where: {
        id: dto.documentVersionId,
        applicationDocumentId: document.id,
      },
    });

    if (!version) {
      throw new ValidationException(
        'Application document version not found or Document already uploaded',
        { documentVersion: ['Document version not found or already uploaded'] },
      );
    }

    return {
      documentScope: 'APPLICATION',
      documentId: document.id,
      documentVersionId: version.id,
      storageKey: version.storageKey,
      originalFileName: version.originalFileName,
      uploadStatus: version.uploadStatus,
    };
  }

  private async resolvePendingLeadScopedUploadOrThrow(
    application: Applications,
    requirement: ApplicationRequiredDocuments,
    dto: ConfirmApplicationDocumentUploadRequestDto,
  ): Promise<PendingUploadForConfirmation> {
    if (!application.leadId) {
      throw new ValidationException('Application has no lead', {
        application: ['leadId is required for lead-scoped documents'],
      });
    }

    const document = await this.db.leadDocuments.findOne({
      where: {
        id: dto.documentId,
        leadId: application.leadId,
        sysDocumentTypeId: requirement.sysDocumentTypeId,
      },
    });

    if (!document) {
      throw new ValidationException(
        'Lead document not found or Document already uploaded',
        { document: ['Document not found or already uploaded'] },
      );
    }

    const version = await this.db.leadDocumentVersions.findOne({
      where: {
        id: dto.documentVersionId,
        leadDocumentId: document.id,
      },
    });

    if (!version) {
      throw new ValidationException(
        'Lead document version not found or Document already uploaded',
        { documentVersion: ['Document version not found or already uploaded'] },
      );
    }

    return {
      documentScope: 'LEAD',
      documentId: document.id,
      documentVersionId: version.id,
      storageKey: version.storageKey,
      originalFileName: version.originalFileName,
      uploadStatus: version.uploadStatus,
    };
  }

  private ensureUploadCanBeConfirmedOrThrow(
    uploadStatus: UploadStatus | null | undefined,
  ): void {
    if (uploadStatus === UploadStatus.PENDING) return;
    if (uploadStatus === UploadStatus.UPLOADED) return;

    throw new ValidationException('Upload cannot be confirmed', {
      uploadStatus: [`Current upload status is ${uploadStatus ?? 'UNKNOWN'}`],
    });
  }

  private async markRequirementInProgressIfNeeded(
    manager: EntityManager,
    applicationRequirementId: string,
  ): Promise<void> {
    const requirementRepo = manager.getRepository(ApplicationRequiredDocuments);
    const requirement = await requirementRepo.findOne({
      where: { id: applicationRequirementId },
    });

    if (!requirement) {
      throw new NotFoundException('Application requirement not found');
    }

    if (
      requirement.overallStatus == null ||
      requirement.overallStatus === ApplicationRequirementStatus.Pending
    ) {
      requirement.overallStatus = ApplicationRequirementStatus.InProgress;
      await requirementRepo.save(requirement);
    }
  }

  private async confirmApplicationScopedUpload(
    manager: EntityManager,
    currentUserId: string,
    pending: PendingUploadForConfirmation,
  ): Promise<void> {
    const versionRepo = manager.getRepository(ApplicationDocumentVersions);
    const documentRepo = manager.getRepository(ApplicationDocuments);
    const version = await versionRepo.findOne({
      where: {
        id: pending.documentVersionId,
        applicationDocumentId: pending.documentId,
      },
    });
    const document = await documentRepo.findOne({
      where: {
        id: pending.documentId,
      },
    });

    if (!version) {
      throw new NotFoundException('Application document version not found');
    }
    if (!document) {
      throw new NotFoundException('Application document not found');
    }

    // set the status
    version.uploadStatus = UploadStatus.UPLOADED;
    version.verificationStatus = VerificationStatus.PENDING;
    version.uploadedByUserId = currentUserId;
    await versionRepo.save(version);

    document.currentVersionId = version.id;
    document.latestFileName = this.storageKeyBuilder.sanitizeFileName(
      version.originalFileName,
    );
    document.overallStatus = ApplicationDocumentStatus.InProgress;
    document.updatedByUserId = currentUserId;
    await documentRepo.save(document);
  }

  private async confirmLeadScopedUpload(
    manager: EntityManager,
    currentUserId: string,
    pending: PendingUploadForConfirmation,
  ): Promise<void> {
    const versionRepo = manager.getRepository(LeadDocumentVersions);
    const documentRepo = manager.getRepository(LeadDocuments);
    const version = await versionRepo.findOne({
      where: {
        id: pending.documentVersionId,
        leadDocumentId: pending.documentId,
      },
    });
    const document = await documentRepo.findOne({
      where: {
        id: pending.documentId,
      },
    });

    if (!version) {
      throw new NotFoundException('Lead document version not found');
    }
    if (!document) {
      throw new NotFoundException('Lead document not found');
    }

    version.uploadStatus = UploadStatus.UPLOADED;
    version.verificationStatus = VerificationStatus.PENDING;
    version.uploadedByUserId = currentUserId;
    await versionRepo.save(version);

    document.currentLeadDocumentVersionId = version.id;
    document.latestFileName = this.storageKeyBuilder.sanitizeFileName(
      version.originalFileName,
    );
    document.overallStatus = ApplicationDocumentStatus.InProgress;
    document.verificationStatus = VerificationStatus.PENDING;
    document.updatedByUserId = currentUserId;
    await documentRepo.save(document);
  }

  private async resolveApplicationScopedDownloadOrNull(
    applicationId: string,
    documentId: string,
  ): Promise<DownloadableDocument | null> {
    const document = await this.db.applicationDocuments.findOne({
      where: {
        id: documentId,
        applicationId,
        overallStatus: In([
          ApplicationDocumentStatus.InProgress,
          ApplicationDocumentStatus.Verified,
        ]),
      },
    });

    if (!document) {
      return null;
    }
    if (!document.currentVersionId) {
      return null;
    }

    const version = await this.db.applicationDocumentVersions.findOne({
      where: {
        id: document.currentVersionId,
        applicationDocumentId: document.id,
        uploadStatus: UploadStatus.UPLOADED,
      },
    });

    if (!version) {
      throw new NotFoundException('Uploaded document version not found');
    }

    return {
      documentScope: 'APPLICATION',
      documentId: document.id,
      documentVersionId: version.id,
      storageKey: version.storageKey,
      fileName: version.originalFileName,
    };
  }

  private async resolveLeadScopedDownloadOrNull(
    application: Applications,
    documentId: string,
  ): Promise<DownloadableDocument | null> {
    if (!application.leadId) {
      return null;
    }

    const document = await this.db.leadDocuments.findOne({
      where: {
        id: documentId,
        leadId: application.leadId,
        overallStatus: In([
          ApplicationDocumentStatus.InProgress,
          ApplicationDocumentStatus.Verified,
        ]),
      },
    });

    if (!document) {
      return null;
    }
    if (!document.currentLeadDocumentVersionId) {
      return null;
    }

    const stageRequirement = await this.db.applicationRequiredDocuments.findOne(
      {
        where: {
          applicationId: application.id,
          sysApplicationStageId: application.currentSysApplicationStageId,
          sourceType: ApplicationDocumentSourceType.Lead,
          sysDocumentTypeId: document.sysDocumentTypeId,
        },
      },
    );

    if (!stageRequirement) {
      return null;
    }

    const version = await this.db.leadDocumentVersions.findOne({
      where: {
        id: document.currentLeadDocumentVersionId,
        leadDocumentId: document.id,
        uploadStatus: UploadStatus.UPLOADED,
      },
    });

    if (!version) {
      throw new NotFoundException('Uploaded lead document version not found');
    }

    return {
      documentScope: 'LEAD',
      documentId: document.id,
      documentVersionId: version.id,
      storageKey: version.storageKey,
      fileName: version.originalFileName,
    };
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
    const safeName = this.storageKeyBuilder.sanitizeFileName(dto.fileName);

    const appDoc =
      await this.documentLinker.createOrReuseApplicationScopedDocument(
        manager,
        {
          applicationId: application.id,
          requirement,
          latestFileName: safeName,
          actedByUserId: currentUserId,
        },
      );

    const versionNumber =
      await this.versionSequencer.nextApplicationDocumentVersionNumber(
        manager,
        appDoc.id,
      );

    const storageKey = this.storageKeyBuilder.buildApplicationScopedStorageKey(
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
      documentId: appDoc.id,
      documentScope: 'APPLICATION',
      documentVersionId: version.id,
      storageKey,
      mimeType: dto.mimeType,
    };
  }

  /**
   * LEAD requirement: resolve lead master, append pending LeadDocumentVersions.
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

    const safeName = this.storageKeyBuilder.sanitizeFileName(dto.fileName);

    const leadDocument =
      await this.documentLinker.createOrReuseLeadScopedDocument(manager, {
        leadId,
        requirement,
        latestFileName: safeName,
        actedByUserId: currentUserId,
      });

    const versionNumber =
      await this.versionSequencer.nextLeadDocumentVersionNumber(
        manager,
        leadDocument.id,
      );

    const storageKey = this.storageKeyBuilder.buildLeadScopedStorageKey(
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
      documentId: leadDocument.id,
      documentScope: 'LEAD',
      documentVersionId: version.id,
      storageKey,
      mimeType: dto.mimeType,
    };
  }
}
