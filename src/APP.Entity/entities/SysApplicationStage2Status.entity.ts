import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { SysApplicationStage } from './SysApplicationStage.entity';
import { SysApplicationStatus } from './SysApplicationStatus.entity';

/**
 * @class SysApplicationStage2Status
 * @extends {BaseEntity}
 * Junction: which application statuses are valid for which stages.
 */
@Entity('sys_ApplicationStage2Status')
@Index('IX_SysApplicationStage2Status_stage_status', [
  'sysApplicationStageId',
  'sysApplicationStatusId',
], { unique: true })
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
  // Navigation
  // ========================================

  @ManyToOne(() => SysApplicationStage)
  @JoinColumn({ name: 'sysApplicationStageId' })
  SysApplicationStage!: SysApplicationStage;

  @ManyToOne(() => SysApplicationStatus)
  @JoinColumn({ name: 'sysApplicationStatusId' })
  SysApplicationStatus!: SysApplicationStatus;
}
