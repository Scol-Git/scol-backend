import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { ApplicationDocumentSourceType } from '@shared/enums/ApplicationDocumentSourceType.enum';
import { ApplicationRequirementStatus } from '@shared/enums/ApplicationRequirementStatus.enum';
import { BaseEntity } from './BaseEntity.template';
import { Applications } from './Applications.entity';
import { SysApplicationStage } from './SysApplicationStage.entity';
import { SysDocumentTypes } from './SysDocumentTypes.entity';
import { SysStageRequiredDocuments } from './SysStageRequiredDocuments.entity';
import { ApplicationDocuments } from './ApplicationDocuments.entity';
import { ApplicationActivities } from './ApplicationActivities.entity';

/**
 * Resolved document requirements for a specific application (course + stage + overrides).
 */
@Index('IX_ApplicationRequiredDocuments_applicationId', ['applicationId'])
@Index('IX_ApplicationRequiredDocuments_sysDocumentTypeId', [
  'sysDocumentTypeId',
])
@Index('IX_ApplicationRequiredDocuments_sysApplicationStageId', [
  'sysApplicationStageId',
])
@Index('IX_ApplicationRequiredDocuments_sysStageRequiredDocumentId', [
  'sysStageRequiredDocumentId',
])
@Entity('ApplicationRequiredDocuments')
export class ApplicationRequiredDocuments extends BaseEntity {
  @Column({
    name: 'applicationId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationId!: string;

  @Column({
    name: 'sysApplicationStageId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  sysApplicationStageId?: string;

  @Column({
    name: 'sysDocumentTypeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysDocumentTypeId!: string;

  @Column({
    name: 'sysStageRequiredDocumentId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  sysStageRequiredDocumentId?: string;

  @Column({
    name: 'isRequired',
    type: 'boolean',
    nullable: true,
  })
  @AutoMap()
  isRequired?: boolean;

  @Column({
    name: 'isMultipleAllowed',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  @AutoMap()
  isMultipleAllowed!: boolean;

  @Column({
    name: 'overallStatus',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  overallStatus?: ApplicationRequirementStatus;

  @Column({
    name: 'allowedMimeTypes',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  allowedMimeTypes?: string;

  @Column({
    name: 'maxFileSizeBytes',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  maxFileSizeBytes?: number;

  @Column({
    name: 'minCount',
    type: 'int',
    nullable: false,
    default: 1,
  })
  @AutoMap()
  minCount!: number;

  @Column({
    name: 'maxCount',
    type: 'int',
    nullable: false,
    default: 1,
  })
  @AutoMap()
  maxCount!: number;

  @Column({
    name: 'sourceType',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @AutoMap()
  sourceType!: ApplicationDocumentSourceType;

  @Column({
    name: 'displayOrder',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  displayOrder?: number;

  @Column({
    name: 'remarks',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  remarks?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  @ManyToOne(() => Applications, (app) => app.ApplicationRequiredDocuments, {
    nullable: false,
  })
  @JoinColumn({ name: 'applicationId' })
  Application!: Applications;

  @ManyToOne(
    () => SysApplicationStage,
    (stage) => stage.ApplicationRequiredDocuments,
    { nullable: true },
  )
  @JoinColumn({ name: 'sysApplicationStageId' })
  SysApplicationStage?: SysApplicationStage;

  @ManyToOne(() => SysDocumentTypes, (dt) => dt.ApplicationRequiredDocuments, {
    nullable: false,
  })
  @JoinColumn({ name: 'sysDocumentTypeId' })
  SysDocumentType!: SysDocumentTypes;

  @ManyToOne(
    () => SysStageRequiredDocuments,
    (row) => row.ApplicationRequiredDocuments,
    { nullable: true },
  )
  @JoinColumn({ name: 'sysStageRequiredDocumentId' })
  SysStageRequiredDocument?: SysStageRequiredDocuments;

  @OneToMany(
    () => ApplicationDocuments,
    (doc) => doc.ApplicationRequiredDocument,
  )
  ApplicationDocuments!: ApplicationDocuments[];

  @OneToMany(() => ApplicationActivities, (a) => a.ApplicationRequiredDocument)
  ApplicationActivities!: ApplicationActivities[];
}
