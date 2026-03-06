import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { Document } from './Document.entity';
import { UploadStatus } from '@shared/enums/UploadStatus.enum';
import { VerificationStatus } from '@shared/enums/VerificationStatus.enum';

/**
 * A single version of a document (file) in storage.
 */
@Entity('DocumentVersions')
export class DocumentVersion extends BaseEntity {
  @Column({
    name: 'documentId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  documentId!: string;

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
  storageProvider!: string;

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
    nullable: true,
  })
  @AutoMap()
  verificationStatus?: VerificationStatus;

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

  @ManyToOne(() => Document, (doc) => doc.versions)
  @JoinColumn({ name: 'documentId' })
  document!: Document;
}
