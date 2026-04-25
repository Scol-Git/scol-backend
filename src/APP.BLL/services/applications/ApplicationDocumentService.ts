import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { AppDbContext } from '@infra/db/typeorm/AppDbContext';
import { ApplicationDocumentVersions } from '@entity/entities/ApplicationDocumentVersions.entity';
import { ApplicationRequiredDocuments } from '@entity/entities/ApplicationRequiredDocuments.entity';
import { Applications } from '@entity/entities/Applications.entity';
import { LeadDocumentVersions } from '@entity/entities/LeadDocumentVersions.entity';
import { ApplicationDocumentSourceType } from '@shared/enums/ApplicationDocumentSourceType.enum';
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
import { ApplicationDocumentLinker } from './helpers/ApplicationDocumentLinker';
import { ApplicationDocumentVersionSequencer } from './helpers/ApplicationDocumentVersionSequencer';
import { ApplicationDocumentStorageKeyBuilder } from './helpers/ApplicationDocumentStorageKeyBuilder';
import type { PendingUploadInitializationResult } from './helpers/application-upload.types';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';

const UPLOAD_URL_EXPIRES_SECONDS = 900;

@Injectable()
export class ApplicationDocumentService {
  constructor(
    private readonly db: AppDbContext,
    private readonly validator: ApplicationValidator,
    private readonly access: ApplicationAccessService,
    private readonly uploadPolicy: ApplicationDocumentUploadPolicy,
    private readonly mapper: ApplicationMapper,
    private readonly documentLinker: ApplicationDocumentLinker,
    private readonly versionSequencer: ApplicationDocumentVersionSequencer,
    private readonly storageKeyBuilder: ApplicationDocumentStorageKeyBuilder,
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

    const existingVerifiedDocumentCount =
      await this.countExistingVerifiedDocumentsForRequirement(
        application,
        requirement,
      );

    this.uploadPolicy.validateUploadOrThrow(
      requirement,
      dto,
      existingVerifiedDocumentCount,
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
      documentId: String(pending.documentId),
      documentVersionId: pending.documentVersionId,
      uploadUrl,
      mimeType: pending.mimeType,
      expiresInSeconds: UPLOAD_URL_EXPIRES_SECONDS,
    });
  }

  private async countExistingVerifiedDocumentsForRequirement(
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
