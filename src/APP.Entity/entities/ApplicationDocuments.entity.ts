import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { DocumentScope } from '@shared/enums/DocumentScope.enum';
import { ApplicationDocumentStatus } from '@shared/enums/ApplicationDocumentStatus.enum';
import { BaseEntity } from './BaseEntity.template';
import { Applications } from './Applications.entity';
import { SysDocumentTypes } from './SysDocumentTypes.entity';
import { ApplicationRequiredDocuments } from './ApplicationRequiredDocuments.entity';
import { LeadDocuments } from './LeadDocuments.entity';
import { LeadDocumentVersions } from './LeadDocumentVersions.entity';
import { ApplicationDocumentVersions } from './ApplicationDocumentVersions.entity';
import { ApplicationActivities } from './ApplicationActivities.entity';

/**
 * Application-scoped document (may link to lead document or application-only uploads).
 */
@Index('IX_ApplicationDocuments_applicationId', ['applicationId'])
@Index('IX_ApplicationDocuments_sysDocumentTypeId', ['sysDocumentTypeId'])
@Index('IX_ApplicationDocuments_applicationRequirementId', [
  'applicationRequirementId',
])
@Entity('ApplicationDocuments')
export class ApplicationDocuments extends BaseEntity {
  @Column({
    name: 'applicationId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationId!: string;

  @Column({
    name: 'sysDocumentTypeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysDocumentTypeId!: string;

  @Column({
    name: 'applicationRequirementId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationRequirementId!: string;

  @Column({
    name: 'latestFileName',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  latestFileName?: string;

  @Column({
    name: 'currentVersionId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  currentVersionId?: string;

  @Column({
    name: 'overallStatus',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  overallStatus?: ApplicationDocumentStatus;

  @Column({
    name: 'remarks',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  remarks?: string;

  //isActive boolean : default true
  @Column({
    name: 'isActive',
    type: 'boolean',
    nullable: false,
    default: true,
  })
  @AutoMap()
  isActive!: boolean;

  @Column({
    name: 'createdByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  createdByUserId?: string;

  @Column({
    name: 'updatedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  updatedByUserId?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  @ManyToOne(() => Applications, (app) => app.ApplicationDocuments, {
    nullable: false,
  })
  @JoinColumn({ name: 'applicationId' })
  Application!: Applications;

  @ManyToOne(() => SysDocumentTypes, (dt) => dt.ApplicationDocuments, {
    nullable: false,
  })
  @JoinColumn({ name: 'sysDocumentTypeId' })
  SysDocumentType!: SysDocumentTypes;

  @ManyToOne(
    () => ApplicationRequiredDocuments,
    (req) => req.ApplicationDocuments,
    { nullable: false },
  )
  @JoinColumn({ name: 'applicationRequirementId' })
  ApplicationRequiredDocument!: ApplicationRequiredDocuments;

  @OneToMany(() => ApplicationDocumentVersions, (v) => v.ApplicationDocument)
  ApplicationDocumentVersions!: ApplicationDocumentVersions[];

  @OneToMany(() => ApplicationActivities, (a) => a.ApplicationDocument)
  ApplicationActivities!: ApplicationActivities[];
}
