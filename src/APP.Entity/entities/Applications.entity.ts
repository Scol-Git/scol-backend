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
import { ApplicationStatusHistory } from './ApplicationStatusHistory.entity';
import { ApplicationStageHistory } from './ApplicationStageHistory.entity';
import { ApplicationDocuments } from './ApplicationDocuments.entity';
import { ApplicationRequiredDocuments } from './ApplicationRequiredDocuments.entity';

/**
 * @class Applications
 * @extends {BaseEntity}
 * Core application entity: lead applying to a course intake.
 */
@Entity('Applications')
@Index('IX_Applications_leadId', ['leadId'])
@Index('IX_Applications_courseIntakeId', ['courseIntakeId'])
@Index('IX_Applications_currentStatusId', ['currentStatusId'])
@Index('IX_Applications_currentStageId', ['currentStageId'])
@Index('IX_Applications_assignedToUserId', ['assignedToUserId'])
export class Applications extends BaseEntity {
  @Column({
    name: 'leadId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  leadId!: string;

  @Column({
    name: 'courseIntakeId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  courseIntakeId!: string;

  @Column({
    name: 'currentStatusId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  currentStatusId!: string;

  @Column({
    name: 'currentStageId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  currentStageId!: string;

  @Column({
    name: 'lastStatusUpdatedAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  lastStatusUpdatedAt?: Date;

  @Column({
    name: 'lastStageUpdatedAt',
    type: 'timestamptz',
    nullable: true,
  })
  @AutoMap()
  lastStageUpdatedAt?: Date;

  @Column({
    name: 'assignedToUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  assignedToUserId?: string | null;

  // ========================================
  // Navigation
  // ========================================

  @ManyToOne(() => SysLeadProfiles)
  @JoinColumn({ name: 'leadId' })
  SysLeadProfile!: SysLeadProfiles;

  @ManyToOne(() => UniCourseIntakes, (intake) => intake.Application)
  @JoinColumn({ name: 'courseIntakeId' })
  UniCourseIntake!: UniCourseIntakes;

  @ManyToOne(() => SysApplicationStatus)
  @JoinColumn({ name: 'currentStatusId' })
  SysApplicationStatus!: SysApplicationStatus;

  @ManyToOne(() => SysApplicationStage)
  @JoinColumn({ name: 'currentStageId' })
  SysApplicationStage!: SysApplicationStage;

  @ManyToOne(() => SysUsers)
  @JoinColumn({ name: 'assignedToUserId' })
  AssignedToUser?: SysUsers | null;

  @OneToMany(
    () => ApplicationStatusHistory,
    (h) => h.Application,
    { cascade: true },
  )
  ApplicationStatusHistory!: ApplicationStatusHistory[];

  @OneToMany(
    () => ApplicationStageHistory,
    (h) => h.Application,
    { cascade: true },
  )
  ApplicationStageHistory!: ApplicationStageHistory[];

  @OneToMany(() => ApplicationDocuments, (d) => d.Application, { cascade: true })
  ApplicationDocument!: ApplicationDocuments[];

  @OneToMany(
    () => ApplicationRequiredDocuments,
    (r) => r.Application,
    { cascade: true },
  )
  ApplicationRequiredDocument!: ApplicationRequiredDocuments[];
}
