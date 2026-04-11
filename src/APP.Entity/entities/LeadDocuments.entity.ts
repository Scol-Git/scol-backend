import {
  Entity,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { LeadDocumentOverallStatus } from '@shared/enums/LeadDocumentOverallStatus.enum';
import { VerificationStatus } from '@shared/enums/VerificationStatus.enum';
import { BaseEntity } from './BaseEntity.template';
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { SysDocumentTypes } from './SysDocumentTypes.entity';
import { LeadDocumentVersions } from './LeadDocumentVersions.entity';

/**
 * Lead-level document aggregate (files before/during application submission).
 */
@Index('IX_LeadDocuments_leadId', ['leadId'])
@Index('IX_LeadDocuments_sysDocumentTypeId', ['sysDocumentTypeId'])
@Entity('LeadDocuments')
export class LeadDocuments extends BaseEntity {
  @Column({
    name: 'leadId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'sysDocumentTypeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysDocumentTypeId!: string;

  @Column({
    name: 'title',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  title?: string;

  @Column({
    name: 'currentLeadDocumentVersionId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  currentLeadDocumentVersionId?: string;

  @Column({
    name: 'overallStatus',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  overallStatus?: LeadDocumentOverallStatus;

  @Column({
    name: 'verificationStatus',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  verificationStatus?: VerificationStatus;

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

  @ManyToOne(() => SysLeadProfiles, (lead) => lead.LeadDocuments)
  @JoinColumn({ name: 'leadId' })
  SysLeadProfile!: SysLeadProfiles;

  @ManyToOne(() => SysDocumentTypes, (dt) => dt.LeadDocuments)
  @JoinColumn({ name: 'sysDocumentTypeId' })
  SysDocumentType!: SysDocumentTypes;

  @OneToMany(() => LeadDocumentVersions, (v) => v.LeadDocument)
  LeadDocumentVersions!: LeadDocumentVersions[];
}
