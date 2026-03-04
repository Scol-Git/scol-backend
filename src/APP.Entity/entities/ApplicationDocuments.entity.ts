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
import { SysDocumentTypes } from './SysDocumentTypes.entity';
import { ApplicationRequiredDocuments } from './ApplicationRequiredDocuments.entity';
import { SysUsers } from './SysUsers.entity';
import { ApplicationDocumentVersion } from './ApplicationDocumentVersion.entity';

/**
 * @class ApplicationDocuments
 * @extends {BaseEntity}
 * A document attached to an application (e.g. one passport upload), with versions.
 */
@Entity('ApplicationDocuments')
@Index('IX_ApplicationDocuments_applicationId', ['applicationId'])
@Index('IX_ApplicationDocuments_documentTypeId', ['documentTypeId'])
@Index('IX_ApplicationDocuments_applicationRequirementId', [
  'applicationRequirementId',
])
export class ApplicationDocuments extends BaseEntity {
  @Column({
    name: 'applicationId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationId!: string;

  @Column({
    name: 'documentTypeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  documentTypeId!: string;

  @Column({
    name: 'applicationRequirementId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  applicationRequirementId?: string | null;

  @Column({
    name: 'title',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  title?: string;

  @Column({
    name: 'overallStatus',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  overallStatus?: string;

  @Column({
    name: 'createdByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  createdByUserId?: string | null;

  @Column({
    name: 'updatedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  updatedByUserId?: string | null;

  // ========================================
  // Navigation
  // ========================================

  @ManyToOne(() => Applications, (app) => app.ApplicationDocument)
  @JoinColumn({ name: 'applicationId' })
  Application!: Applications;

  @ManyToOne(() => SysDocumentTypes)
  @JoinColumn({ name: 'documentTypeId' })
  SysDocumentType!: SysDocumentTypes;

  @ManyToOne(
    () => ApplicationRequiredDocuments,
    (r) => r.ApplicationDocument,
  )
  @JoinColumn({ name: 'applicationRequirementId' })
  ApplicationRequiredDocument?: ApplicationRequiredDocuments | null;

  @ManyToOne(() => SysUsers)
  @JoinColumn({ name: 'createdByUserId' })
  CreatedByUser?: SysUsers | null;

  @ManyToOne(() => SysUsers)
  @JoinColumn({ name: 'updatedByUserId' })
  UpdatedByUser?: SysUsers | null;

  @OneToMany(
    () => ApplicationDocumentVersion,
    (v) => v.ApplicationDocument,
    { cascade: true },
  )
  ApplicationDocumentVersion!: ApplicationDocumentVersion[];
}
