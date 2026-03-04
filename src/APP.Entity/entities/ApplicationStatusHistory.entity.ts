import {
  Entity,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';
import { Applications } from './Applications.entity';
import { SysApplicationStatus } from './SysApplicationStatus.entity';
import { SysUsers } from './SysUsers.entity';

/**
 * @class ApplicationStatusHistory
 * @extends {BaseEntity}
 * History of application status changes. Use BaseEntity.updatedAt for when the change was recorded.
 */
@Entity('ApplicationStatusHistories')
@Index('IX_ApplicationStatusHistories_applicationId', ['applicationId'])
@Index('IX_ApplicationStatusHistories_toSysStatusId', ['toSysStatusId'])
export class ApplicationStatusHistory extends BaseEntity {
  @Column({
    name: 'applicationId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationId!: string;

  @Column({
    name: 'fromSysStatusId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  fromSysStatusId?: string | null;

  @Column({
    name: 'toSysStatusId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  toSysStatusId!: string;

  @Column({
    name: 'changedByUserId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  changedByUserId?: string | null;

  @Column({
    name: 'remarks',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  @AutoMap()
  remarks?: string;

  // ========================================
  // Navigation
  // ========================================

  @ManyToOne(() => Applications, (app) => app.ApplicationStatusHistory)
  @JoinColumn({ name: 'applicationId' })
  Application!: Applications;

  @ManyToOne(() => SysApplicationStatus)
  @JoinColumn({ name: 'fromSysStatusId' })
  FromSysApplicationStatus?: SysApplicationStatus | null;

  @ManyToOne(() => SysApplicationStatus)
  @JoinColumn({ name: 'toSysStatusId' })
  ToSysApplicationStatus!: SysApplicationStatus;

  @ManyToOne(() => SysUsers)
  @JoinColumn({ name: 'changedByUserId' })
  ChangedByUser?: SysUsers | null;
}
