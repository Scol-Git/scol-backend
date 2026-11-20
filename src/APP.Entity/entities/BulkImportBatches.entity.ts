import { Entity, Column, Index, ManyToOne, JoinColumn } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysUsers } from './SysUsers.entity';
import { BulkImportType } from '@shared/enums/crm/BulkImportType.enum';
import { BulkImportStatus } from '@shared/enums/crm/BulkImportStatus.enum';

/**
 * One row per uploaded CSV file. The batch is the unit of tracking,
 * error reporting, publishing and discarding.
 */
@Entity('BulkImportBatches')
@Index('IX_BulkImportBatches_status_queuedAt', ['status', 'queuedAt'])
export class BulkImportBatches extends BaseEntity {
  @Column({ name: 'type', type: 'varchar', length: 20, nullable: false })
  @AutoMap()
  type!: BulkImportType;

  @Column({ name: 'status', type: 'varchar', length: 30, nullable: false })
  @AutoMap()
  status!: BulkImportStatus;

  @Column({ name: 'fileName', type: 'varchar', length: 255, nullable: false })
  @AutoMap()
  fileName!: string;

  @Column({ name: 'fileSizeBytes', type: 'int', nullable: false })
  @AutoMap()
  fileSizeBytes!: number;

  @Column({ name: 'fileHash', type: 'varchar', length: 64, nullable: true })
  @AutoMap()
  fileHash?: string | null;

  @Column({ name: 'originalFileKey', type: 'varchar', length: 512, nullable: false })
  @AutoMap()
  originalFileKey!: string;

  @Column({ name: 'errorsFileKey', type: 'varchar', length: 512, nullable: true })
  @AutoMap()
  errorsFileKey?: string | null;

  @Column({ name: 'totalRows', type: 'int', nullable: false, default: 0 })
  @AutoMap()
  totalRows!: number;

  @Column({ name: 'processedRows', type: 'int', nullable: false, default: 0 })
  @AutoMap()
  processedRows!: number;

  @Column({ name: 'createdCount', type: 'int', nullable: false, default: 0 })
  @AutoMap()
  createdCount!: number;

  @Column({ name: 'updatedCount', type: 'int', nullable: false, default: 0 })
  @AutoMap()
  updatedCount!: number;

  @Column({ name: 'skippedCount', type: 'int', nullable: false, default: 0 })
  @AutoMap()
  skippedCount!: number;

  @Column({ name: 'errorCount', type: 'int', nullable: false, default: 0 })
  @AutoMap()
  errorCount!: number;

  @Column({ name: 'warningCount', type: 'int', nullable: false, default: 0 })
  @AutoMap()
  warningCount!: number;

  @Column({ name: 'publishedCount', type: 'int', nullable: false, default: 0 })
  @AutoMap()
  publishedCount!: number;

  @Column({ name: 'failureReason', type: 'text', nullable: true })
  @AutoMap()
  failureReason?: string | null;

  @Column({ name: 'retryCount', type: 'int', nullable: false, default: 0 })
  @AutoMap()
  retryCount!: number;

  @Column({ name: 'uploadedBy', type: 'uuid', nullable: false })
  @AutoMap()
  uploadedBy!: string;

  @Column({ name: 'publishedBy', type: 'uuid', nullable: true })
  @AutoMap()
  publishedBy?: string | null;

  @Column({ name: 'queuedAt', type: 'timestamptz', nullable: true })
  @AutoMap()
  queuedAt?: Date | null;

  @Column({ name: 'startedAt', type: 'timestamptz', nullable: true })
  @AutoMap()
  startedAt?: Date | null;

  @Column({ name: 'heartbeatAt', type: 'timestamptz', nullable: true })
  @AutoMap()
  heartbeatAt?: Date | null;

  @Column({ name: 'processedAt', type: 'timestamptz', nullable: true })
  @AutoMap()
  processedAt?: Date | null;

  @Column({ name: 'publishedAt', type: 'timestamptz', nullable: true })
  @AutoMap()
  publishedAt?: Date | null;

  /** Set when original.csv / errors.csv were permanently removed from storage (retention). */
  @Column({ name: 'filesDeletedAt', type: 'timestamptz', nullable: true })
  @AutoMap()
  filesDeletedAt?: Date | null;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  @ManyToOne(() => SysUsers, { nullable: false })
  @JoinColumn({ name: 'uploadedBy' })
  UploadedByUser!: SysUsers;

  @ManyToOne(() => SysUsers, { nullable: true })
  @JoinColumn({ name: 'publishedBy' })
  PublishedByUser?: SysUsers | null;
}
