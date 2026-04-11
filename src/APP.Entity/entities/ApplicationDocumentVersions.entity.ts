import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { StorageProvider } from '@shared/enums/StorageProvider.enum';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';
import { VerificationStatus } from '@shared/enums/VerificationStatus.enum';
import { BaseEntity } from './BaseEntity.template';
import { ApplicationDocuments } from './ApplicationDocuments.entity';

/**
 * Versioned file blob for an application document.
 */
@Index(
  'UQ_ApplicationDocumentVersions_doc_version',
  ['applicationDocumentId', 'versionNumber'],
  { unique: true },
)
@Index('IX_ApplicationDocumentVersions_applicationDocumentId', [
  'applicationDocumentId',
])
@Entity('ApplicationDocumentVersions')
export class ApplicationDocumentVersions extends BaseEntity {
  @Column({
    name: 'applicationDocumentId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationDocumentId!: string;

  @Column({
    name: 'versionNumber',
    type: 'int',
    nullable: false,
  })
  @AutoMap()
  versionNumber!: number;

  @Column({
    name: 'storageProvider',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @AutoMap()
  storageProvider!: StorageProvider;

  @Column({
    name: 'storageKey',
    type: 'varchar',
    length: 500,
    nullable: false,
  })
  @AutoMap()
  storageKey!: string;

  @Column({
    name: 'originalFileName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  originalFileName!: string;

  @Column({
    name: 'mimeType',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  @AutoMap()
  mimeType!: string;

  @Column({
    name: 'fileSizeBytes',
    type: 'int',
    nullable: false,
  })
  @AutoMap()
  fileSizeBytes!: number;

  @Column({
    name: 'sha256Hash',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  @AutoMap()
  sha256Hash?: string;

  @Column({
    name: 'uploadStatus',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  uploadStatus?: UploadStatus;

  @Column({
    name: 'uploadedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  uploadedByUserId?: string;

  @Column({
    name: 'verificationStatus',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @AutoMap()
  verificationStatus!: VerificationStatus;

  @Column({
    name: 'verifiedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  verifiedByUserId?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  @ManyToOne(
    () => ApplicationDocuments,
    (doc) => doc.ApplicationDocumentVersions,
  )
  @JoinColumn({ name: 'applicationDocumentId' })
  ApplicationDocument!: ApplicationDocuments;
}
