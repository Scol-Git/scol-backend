import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { ApplicationDocuments } from './ApplicationDocuments.entity';
import { SysUsers } from './SysUsers.entity';

/**
 * @class ApplicationDocumentVersion
 * @extends {BaseEntity}
 * A single version of an application document (file upload). Use BaseEntity.createdAt for uploadedAt.
 */
@Entity('ApplicationDocumentVersions')
@Index('IX_ApplicationDocumentVersions_applicationDocumentId', [
  'applicationDocumentId',
])
export class ApplicationDocumentVersion extends BaseEntity {
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
    nullable: true,
  })
  @AutoMap()
  storageProvider?: string;

  @Column({
    name: 'storageKey',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  storageKey?: string;

  @Column({
    name: 'originalFileName',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  originalFileName?: string;

  @Column({
    name: 'mimeType',
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  @AutoMap()
  mimeType?: string;

  @Column({
    name: 'fileSizeBytes',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  fileSizeBytes?: number;

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
  uploadStatus?: string;

  @Column({
    name: 'uploadedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  uploadedByUserId?: string | null;

  @Column({
    name: 'verificationStatus',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  verificationStatus?: string;

  @Column({
    name: 'verifiedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  verifiedByUserId?: string | null;

  @Column({
    name: 'verifiedAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  verifiedAt?: Date | null;

  @Column({
    name: 'rejectionReason',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  rejectionReason?: string;

  @Column({
    name: 'notes',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  notes?: string;

  // ========================================
  // Navigation
  // ========================================

  @ManyToOne(() => ApplicationDocuments, (d) => d.ApplicationDocumentVersion)
  @JoinColumn({ name: 'applicationDocumentId' })
  ApplicationDocument!: ApplicationDocuments;

  @ManyToOne(() => SysUsers)
  @JoinColumn({ name: 'uploadedByUserId' })
  UploadedByUser?: SysUsers | null;

  @ManyToOne(() => SysUsers)
  @JoinColumn({ name: 'verifiedByUserId' })
  VerifiedByUser?: SysUsers | null;
}
