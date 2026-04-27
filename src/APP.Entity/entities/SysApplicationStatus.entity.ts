import { Entity, Column, OneToMany, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { Applications } from './Applications.entity';
import { SysApplicationStage2Status } from './SysApplicationStage2Status.entity';
import { ApplicationActivities } from './ApplicationActivities.entity';

/**
 * Lookup: application status (e.g. pending, approved).
 */
@Index('UQ_sys_ApplicationStatus_statusCode', ['statusCode'], { unique: true })
@Entity('sys_ApplicationStatus')
export class SysApplicationStatus extends BaseEntity {
  @Column({
    name: 'statusCode',
    type: 'varchar',
    length: 100,
    nullable: false,
  })
  @AutoMap()
  statusCode!: string;

  @Column({
    name: 'statusName',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  @AutoMap()
  statusName?: string;

  @Column({
    name: 'statusOrder',
    type: 'int',
    nullable: true,
  })
  @AutoMap()
  statusOrder?: number;

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
  @OneToMany(() => Applications, (app) => app.CurrentSysApplicationStatus)
  CurrentApplications!: Applications[];

  @OneToMany(
    () => SysApplicationStage2Status,
    (row) => row.SysApplicationStatus,
  )
  ApplicationStageToStatuses!: SysApplicationStage2Status[];

  @OneToMany(() => ApplicationActivities, (a) => a.SysApplicationStatus)
  ApplicationActivities!: ApplicationActivities[];
}
