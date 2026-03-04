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
import { SysApplicationStage } from './SysApplicationStage.entity';
import { SysUsers } from './SysUsers.entity';

/**
 * @class ApplicationStageHistory
 * @extends {BaseEntity}
 * History of application stage changes. Use BaseEntity.updatedAt for when the change was recorded.
 */
@Entity('ApplicationStageHistories')
@Index('IX_ApplicationStageHistories_applicationId', ['applicationId'])
@Index('IX_ApplicationStageHistories_toSysStageId', ['toSysStageId'])
export class ApplicationStageHistory extends BaseEntity {
  @Column({
    name: 'applicationId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  applicationId!: string;

  @Column({
    name: 'fromSysStageId',
    type: 'uuid',
    nullable: true,
  })
  @AutoMap()
  fromSysStageId?: string | null;

  @Column({
    name: 'toSysStageId',
    type: 'uuid',
    nullable: false,
  })
  @AutoMap()
  toSysStageId!: string;

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

  @ManyToOne(() => Applications, (app) => app.ApplicationStageHistory)
  @JoinColumn({ name: 'applicationId' })
  Application!: Applications;

  @ManyToOne(() => SysApplicationStage)
  @JoinColumn({ name: 'fromSysStageId' })
  FromSysApplicationStage?: SysApplicationStage | null;

  @ManyToOne(() => SysApplicationStage)
  @JoinColumn({ name: 'toSysStageId' })
  ToSysApplicationStage!: SysApplicationStage;

  @ManyToOne(() => SysUsers)
  @JoinColumn({ name: 'changedByUserId' })
  ChangedByUser?: SysUsers | null;
}
