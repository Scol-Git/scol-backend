import {
  Entity,
  Column,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { ApplicationRequiredDocuments } from './ApplicationRequiredDocuments.entity';
import { Applications } from './Applications.entity';
import { ApplicationStageHistory } from './ApplicationStageHistory.entity';
import { SysApplicationStage2Status } from './SysApplicationStage2Status.entity';

/**
 * Lookup: application workflow stage (e.g. draft, submitted).
 */
@Index('UQ_sys_ApplicationStage_stageCode', ['stageCode'], { unique: true })
@Entity('sys_ApplicationStage')
export class SysApplicationStage extends BaseEntity {
  @Column({
    name: 'stageCode',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  @AutoMap()
  stageCode!: string;

  @Column({
    name: 'stageName',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  stageName?: string;

  @Column({
    name: 'stageOrder',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  stageOrder?: number;

  @Column({
    name: 'isTerminal',
    type: 'boolean',
    nullable: true,
  })
  @AutoMap()
  isTerminal?: boolean;

  // ========================================
  // Navigation Properties (EF Core style)
  // ========================================
  @OneToMany(
    () => ApplicationRequiredDocuments,
    (req) => req.SysApplicationStage,
  )
  ApplicationRequiredDocuments!: ApplicationRequiredDocuments[];

  @OneToMany(() => Applications, (app) => app.CurrentSysApplicationStage)
  CurrentApplications!: Applications[];

  @OneToMany(() => SysApplicationStage2Status, (row) => row.SysApplicationStage)
  ApplicationStageToStatuses!: SysApplicationStage2Status[];

  @OneToMany(
    () => ApplicationStageHistory,
    (row) => row.FromSysApplicationStage,
  )
  ApplicationStageHistoryFrom!: ApplicationStageHistory[];

  @OneToMany(() => ApplicationStageHistory, (row) => row.ToSysApplicationStage)
  ApplicationStageHistoryTo!: ApplicationStageHistory[];
}
