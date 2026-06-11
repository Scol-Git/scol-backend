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
import { SysLeadProfiles } from './SysLeadProfiles.entity';
import { UniCourseIntakes } from './UniCourseIntakes.entity';
import { SysApplicationStatus } from './SysApplicationStatus.entity';
import { SysApplicationStage } from './SysApplicationStage.entity';
import { SysConsultantProfiles } from './SysConsultantProfiles.entity';
import { ApplicationRequiredDocuments } from './ApplicationRequiredDocuments.entity';
import { ApplicationDocuments } from './ApplicationDocuments.entity';
import { ApplicationActivities } from './ApplicationActivities.entity';
import { ApplicationNotes } from './ApplicationNotes.entity';

/**
 * Application for a lead against a course intake (enrollment pipeline).
 */
@Index('IX_Applications_leadId', ['leadId'])
@Index('IX_Applications_courseIntakeId', ['courseIntakeId'])
@Index('IX_Applications_currentSysApplicationStatusId', [
  'currentSysApplicationStatusId',
])
@Index('IX_Applications_currentSysApplicationStageId', [
  'currentSysApplicationStageId',
])
@Index('UQ_Applications_serialNumber', ['serialNumber'], { unique: true })
@Entity('Applications')
export class Applications extends BaseEntity {
  @Column({
    name: 'leadId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId?: string;

  @Column({
    name: 'courseIntakeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  courseIntakeId?: string;

  @Column({
    name: 'currentSysApplicationStatusId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  currentSysApplicationStatusId!: string;

  @Column({
    name: 'currentSysApplicationStageId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  currentSysApplicationStageId!: string;

  @Column({
    name: 'assignedToConsultantId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  assignedToConsultantId?: string | null;

  @Column({
    name: 'submittedAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  submittedAt?: Date;

  @Column({
    name: 'serialNumber',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  @AutoMap()
  serialNumber?: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  @ManyToOne(() => SysLeadProfiles, (lead) => lead.Applications, {
    nullable: false,
  })
  @JoinColumn({ name: 'leadId' })
  SysLeadProfile?: SysLeadProfiles;

  @ManyToOne(() => UniCourseIntakes, (intake) => intake.Applications, {
    nullable: false,
  })
  @JoinColumn({ name: 'courseIntakeId' })
  UniCourseIntake?: UniCourseIntakes;

  @ManyToOne(
    () => SysApplicationStatus,
    (status) => status.CurrentApplications,
    { nullable: false },
  )
  @JoinColumn({ name: 'currentSysApplicationStatusId' })
  CurrentSysApplicationStatus?: SysApplicationStatus;

  @ManyToOne(() => SysApplicationStage, (stage) => stage.CurrentApplications, {
    nullable: false,
  })
  @JoinColumn({ name: 'currentSysApplicationStageId' })
  CurrentSysApplicationStage?: SysApplicationStage;

  @ManyToOne(
    () => SysConsultantProfiles,
    (profile) => profile.AssignedApplications,
    {
      nullable: true,
    },
  )
  @JoinColumn({
    name: 'assignedToConsultantId',
    referencedColumnName: 'id',
  })
  AssignedToConsultant?: SysConsultantProfiles;

  @OneToMany(() => ApplicationRequiredDocuments, (req) => req.Application)
  ApplicationRequiredDocuments!: ApplicationRequiredDocuments[];

  @OneToMany(() => ApplicationDocuments, (doc) => doc.Application)
  ApplicationDocuments!: ApplicationDocuments[];

  @OneToMany(() => ApplicationActivities, (a) => a.Application)
  ApplicationActivities!: ApplicationActivities[];

  @OneToMany(() => ApplicationNotes, (note) => note.Application)
  ApplicationNotes!: ApplicationNotes[];
}
