import { Entity, Column, Index } from 'typeorm';
import { AutoMap } from '@automapper/classes';
import { BaseEntity } from './BaseEntity.template';

/**
 * @class SysApplicationStatus
 * @extends {BaseEntity}
 * Reference table for application status (e.g. Draft, Submitted, Under Review).
 */
@Entity('sys_ApplicationStatus')
@Index('IX_SysApplicationStatus_statusCode', ['statusCode'], { unique: true })
@Index('IX_SysApplicationStatus_statusOrder', ['statusOrder'])
export class SysApplicationStatus extends BaseEntity {
  @Column({
    name: 'statusCode',
    type: 'varchar',
    length: 50,
    nullable: false,
  })
  @AutoMap()
  statusCode!: string;

  @Column({
    name: 'statusName',
    type: 'varchar',
    length: 255,
    nullable: false,
  })
  @AutoMap()
  statusName!: string;

  @Column({
    name: 'statusOrder',
    type: 'int',
    nullable: false,
    default: 0,
  })
  @AutoMap()
  statusOrder!: number;

  @Column({
    name: 'isTerminal',
    type: 'boolean',
    nullable: false,
    default: false,
  })
  @AutoMap()
  isTerminal!: boolean;
}
