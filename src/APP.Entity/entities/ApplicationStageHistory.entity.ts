import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { Applications } from './Applications.entity';
import { SysApplicationStage } from './SysApplicationStage.entity';

/**
 * Audit trail of application stage transitions.
 */
@Index('IX_ApplicationStageHistory_applicationId', ['applicationId'])
@Entity('ApplicationStageHistory')
export class ApplicationStageHistory extends BaseEntity {
  @Column({
    name: 'applicationId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationId!: string;

  @Column({
    name: 'fromSysApplicationStageId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  fromSysApplicationStageId?: string;

  @Column({
    name: 'toSysApplicationStageId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  toSysApplicationStageId!: string;

  @Column({
    name: 'changedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  changedByUserId?: string;

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

  @ManyToOne(() => Applications, (app) => app.ApplicationStageHistories, {
    nullable: false,
  })
  @JoinColumn({ name: 'applicationId' })
  Application!: Applications;

  @ManyToOne(
    () => SysApplicationStage,
    (stage) => stage.ApplicationStageHistoryFrom,
    { nullable: true },
  )
  @JoinColumn({ name: 'fromSysApplicationStageId' })
  FromSysApplicationStage?: SysApplicationStage;

  @ManyToOne(
    () => SysApplicationStage,
    (row) => row.ApplicationStageHistoryTo,
    { nullable: false },
  )
  @JoinColumn({ name: 'toSysApplicationStageId' })
  ToSysApplicationStage!: SysApplicationStage;
}
