import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { Applications } from './Applications.entity';
import { SysApplicationStage } from './SysApplicationStage.entity';
import { SysDocumentTypes } from './SysDocumentTypes.entity';
import { ApplicationDocuments } from './ApplicationDocuments.entity';

/**
 * @class ApplicationRequiredDocuments
 * @extends {BaseEntity}
 * Documents required for an application at a given stage (links application + stage + document type).
 */
@Entity('ApplicationRequiredDocuments')
@Index('IX_ApplicationRequiredDocuments_applicationId', ['applicationId'])
@Index('IX_ApplicationRequiredDocuments_sysApplicationStageId', [
  'sysApplicationStageId',
])
@Index('IX_ApplicationRequiredDocuments_documentTypeId', ['documentTypeId'])
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
    nullable: false,
  })
  @AutoMap()
  sysApplicationStageId!: string;

  @Column({
    name: 'documentTypeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  documentTypeId!: string;

  @Column({
    name: 'isRequired',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  @AutoMap()
  isRequired!: boolean;

  @Column({
    name: 'minCount',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  minCount?: number;

  @Column({
    name: 'maxCount',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  maxCount?: number;

  @Column({
    name: 'sourceType',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  sourceType?: string;

  @Column({
    name: 'remarks',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  remarks?: string;

  // ========================================
  // Navigation
  // ========================================

  @ManyToOne(() => Applications, (app) => app.ApplicationRequiredDocument)
  @JoinColumn({ name: 'applicationId' })
  Application!: Applications;

  @ManyToOne(() => SysApplicationStage)
  @JoinColumn({ name: 'sysApplicationStageId' })
  SysApplicationStage!: SysApplicationStage;

  @ManyToOne(() => SysDocumentTypes)
  @JoinColumn({ name: 'documentTypeId' })
  SysDocumentType!: SysDocumentTypes;

  @OneToMany(
    () => ApplicationDocuments,
    (d) => d.ApplicationRequiredDocument,
  )
  ApplicationDocument!: ApplicationDocuments[];
}
