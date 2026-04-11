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
import { SysUsers } from './SysUsers.entity';
import { ApplicationRequiredDocuments } from './ApplicationRequiredDocuments.entity';
import { ApplicationDocuments } from './ApplicationDocuments.entity';
import { ApplicationStatusHistory } from './ApplicationStatusHistory.entity';
import { ApplicationStageHistory } from './ApplicationStageHistory.entity';

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
    name: 'assignedToUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  assignedToUserId?: string;

  @Column({
    name: 'submittedAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  submittedAt?: Date;

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

  @ManyToOne(() => SysUsers, (user) => user.AssignedApplications, {
    nullable: true,
  })
  @JoinColumn({ name: 'assignedToUserId' })
  AssignedToUser?: SysUsers;

  @OneToMany(() => ApplicationRequiredDocuments, (req) => req.Application)
  ApplicationRequiredDocuments!: ApplicationRequiredDocuments[];

  @OneToMany(() => ApplicationDocuments, (doc) => doc.Application)
  ApplicationDocuments!: ApplicationDocuments[];

  @OneToMany(() => ApplicationStatusHistory, (h) => h.Application)
  ApplicationStatusHistories!: ApplicationStatusHistory[];

  @OneToMany(() => ApplicationStageHistory, (h) => h.Application)
  ApplicationStageHistories!: ApplicationStageHistory[];
}
