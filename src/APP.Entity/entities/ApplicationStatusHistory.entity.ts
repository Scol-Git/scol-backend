import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { Applications } from './Applications.entity';
import { SysApplicationStatus } from './SysApplicationStatus.entity';

/**
 * Audit trail of application status transitions.
 */
@Index('IX_ApplicationStatusHistory_applicationId', ['applicationId'])
@Entity('ApplicationStatusHistory')
export class ApplicationStatusHistory extends BaseEntity {
  @Column({
    name: 'applicationId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationId!: string;

  @Column({
    name: 'fromSysApplicationStatusId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  fromSysApplicationStatusId?: string;

  @Column({
    name: 'toSysApplicationStatusId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  toSysApplicationStatusId!: string;

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

  @ManyToOne(() => Applications, (app) => app.ApplicationStatusHistories, {
    nullable: false,
  })
  @JoinColumn({ name: 'applicationId' })
  Application!: Applications;

  @ManyToOne(
    () => SysApplicationStatus,
    (status) => status.ApplicationStatusHistoryFrom,
    { nullable: true },
  )
  @JoinColumn({ name: 'fromSysApplicationStatusId' })
  FromSysApplicationStatus?: SysApplicationStatus;

  @ManyToOne(
    () => SysApplicationStatus,
    (row) => row.ApplicationStatusHistoryTo,
    { nullable: false },
  )
  @JoinColumn({ name: 'toSysApplicationStatusId' })
  ToSysApplicationStatus!: SysApplicationStatus;
}
