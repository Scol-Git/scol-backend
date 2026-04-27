import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysApplicationStage } from './SysApplicationStage.entity';
import { SysApplicationStatus } from './SysApplicationStatus.entity';

/**
 * Maps allowed statuses to a stage (workflow matrix row).
 */
@Index('IX_sys_ApplicationStage2Status_stage', ['sysApplicationStageId'])
@Index('IX_sys_ApplicationStage2Status_status', ['sysApplicationStatusId'])
@Entity('sys_ApplicationStage2Status')
export class SysApplicationStage2Status extends BaseEntity {
  @Column({
    name: 'sysApplicationStageId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysApplicationStageId!: string;

  @Column({
    name: 'sysApplicationStatusId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  sysApplicationStatusId!: string;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================

  @ManyToOne(
    () => SysApplicationStage,
    (row) => row.ApplicationStageToStatuses,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: 'sysApplicationStageId' })
  SysApplicationStage!: SysApplicationStage;

  @ManyToOne(
    () => SysApplicationStatus,
    (row) => row.ApplicationStageToStatuses,
    {
      nullable: false,
    },
  )
  @JoinColumn({ name: 'sysApplicationStatusId' })
  SysApplicationStatus!: SysApplicationStatus;
}
