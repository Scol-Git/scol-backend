import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { StorageProvider } from '@shared/enums/StorageProvider.enum';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';
import { VerificationStatus } from '@shared/enums/VerificationStatus.enum';
import { BaseEntity } from './BaseEntity.template';
import { LeadDocuments } from './LeadDocuments.entity';

/**
 * Versioned file blob for a lead-scoped document.
 */
@Index(
  'UQ_LeadDocumentVersions_doc_version',
  ['leadDocumentId', 'versionNumber'],
  {
    unique: true,
  },
)
@Index('IX_LeadDocumentVersions_leadDocumentId', ['leadDocumentId'])
@Entity('LeadDocumentVersions')
export class LeadDocumentVersions extends BaseEntity {
  @Column({
    name: 'leadDocumentId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadDocumentId!: string;

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
    nullable: false,
  })
  @AutoMap()
  uploadStatus!: UploadStatus;

  @Column({
    name: 'verificationStatus',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @AutoMap()
  verificationStatus!: VerificationStatus;

  @Column({
    name: 'uploadedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  uploadedByUserId?: string;

  @Column({
    name: 'verifiedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  verifiedByUserId?: string;

  @Column({
    name: 'verifiedAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  verifiedAt?: Date;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  @ManyToOne(() => LeadDocuments, (doc) => doc.LeadDocumentVersions)
  @JoinColumn({ name: 'leadDocumentId' })
  LeadDocument!: LeadDocuments;
}
